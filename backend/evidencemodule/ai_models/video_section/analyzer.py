# evidencemodule/ai_models/video_section/analyzer.py
import cv2
import numpy as np
import subprocess
import json
import os
from utils import to_serializable, logger, get_current_timestamp
from  forensic_checks import ForensicChecks

class VideoForensics:
    def __init__(self, video_path: str):
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video not found: {video_path}")
        self.video_path = video_path
        self.cap = cv2.VideoCapture(video_path)
        if not self.cap.isOpened():
            raise ValueError("Cannot open video file")
        self.fps = self.cap.get(cv2.CAP_PROP_FPS) or 30.0
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.total_frames = max(1, int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT)))
        self.duration = self.total_frames / self.fps
        self.max_samples = min(500, self.total_frames)
        self.sample_every = max(1, self.total_frames // self.max_samples)
        target_w = max(64, int(self.width * 0.5))
        target_h = max(64, int(self.height * 0.5))
        self.scale_x = target_w / self.width
        self.scale_y = target_h / self.height

    def __del__(self):
        if hasattr(self, 'cap') and self.cap.isOpened():
            self.cap.release()

    def safe_resize(self, frame: np.ndarray) -> np.ndarray:
        if frame is None:
            return np.zeros((64, 64, 3), dtype=np.uint8)
        h, w = frame.shape[:2]
        new_w = max(64, int(w * self.scale_x))
        new_h = max(64, int(h * self.scale_y))
        return cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

    def run_full_analysis(self):
        logger.info(f"Analyzing: {os.path.basename(self.video_path)}")
        results = {
            "video_path": self.video_path,
            "basic_info": {
                "resolution": f"{self.width}x{self.height}",
                "fps": round(self.fps, 2),
                "duration_sec": round(self.duration, 2),
                "total_frames": self.total_frames
            },
            "analysis_date": get_current_timestamp()
        }

        # Metadata
        results["metadata"] = ForensicChecks.extract_metadata(self.video_path)
        results["deep_metadata"] = ForensicChecks.extract_deep_metadata(self.video_path)
        results["metadata_inconsistency"] = ForensicChecks.check_metadata_inconsistency(
            results["metadata"], results["deep_metadata"]
        )

        # GOP Analysis
        try:
            cmd = ['ffprobe', '-v', 'error', '-select_streams', 'v',
                   '-show_entries', 'packet=pts_time,flags', '-of', 'csv=p=0', self.video_path]
            out = subprocess.check_output(cmd, text=True, timeout=30)
            kf_pts = [float(l.split(',')[0]) for l in out.splitlines() if ',K' in l and l.split(',')[0] != 'N/A']
            if len(kf_pts) > 3:
                diffs = np.diff(kf_pts)
                results["gop_analysis"] = {
                    "avg_gop_sec": round(float(np.mean(diffs)), 3),
                    "gop_std": round(float(np.std(diffs)), 3),
                    "flagged": np.std(diffs) > 1.3
                }
            else:
                results["gop_analysis"] = {"flagged": True}
        except:
            results["gop_analysis"] = {"flagged": True}

        # Frame loop
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        frame_idx = sampled = dup_count = 0
        prev_gray = None
        ela_vars = noise_vars = motion_flows = []
        dct_spikes = motion_anomalies = 0
        prnu_frames = cpm_results = cfa_results = []
        early_exit = False

        while sampled < self.max_samples and not early_exit:
            ret, frame = self.cap.read()
            if not ret or frame is None: break
            if frame_idx % self.sample_every != 0:
                frame_idx += 1
                continue

            small = self.safe_resize(frame)
            small_gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

            # ELA
            ela_sum = 0
            for q in [75, 85, 95]:
                _, enc = cv2.imencode('.jpg', small, [cv2.IMWRITE_JPEG_QUALITY, q])
                dec = cv2.imdecode(enc, cv2.IMREAD_COLOR)
                diff = np.abs(small.astype(np.float32) - dec.astype(np.float32))
                ela_sum += np.var(diff)
            ela_vars.append(ela_sum / 3)

            # Noise
            blurred = cv2.GaussianBlur(small_gray, (5,5), 0)
            noise_vars.append(float(np.var(small_gray.astype(np.float32) - blurred.astype(np.float32))))

            # Duplication
            if prev_gray is not None and np.mean(cv2.absdiff(small_gray, prev_gray)) < 0.9:
                dup_count += 1

            # Motion
            if prev_gray is not None:
                flow = cv2.calcOpticalFlowFarneback(prev_gray, small_gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
                mag = float(np.mean(np.sqrt(flow[...,0]**2 + flow[...,1]**2)))
                motion_flows.append(mag)
                if len(motion_flows) > 12:
                    avg, std = np.mean(motion_flows[-12:]), np.std(motion_flows[-12:])
                    if mag > avg + 3.8 * std and avg > 0.08:
                        motion_anomalies += 1

            # Double compression
            if sampled % 5 == 0:
                coeffs = []
                for y in range(0, small_gray.shape[0]-8, 8):
                    for x in range(0, small_gray.shape[1]-8, 8):
                        block = small_gray[y:y+8, x:x+8].astype(np.float32) - 128
                        coeffs.extend(cv2.dct(block)[1:,1:].flatten())
                if coeffs:
                    hist, _ = np.histogram(coeffs, bins=100)
                    fft = np.abs(np.fft.fft(hist))[1:10]
                    if np.max(fft) > np.mean(fft) * 7:
                        dct_spikes += 1

            if sampled % 10 == 0:
                cpm_results.append(ForensicChecks.detect_copy_paste_move(small))
                cfa_results.append(ForensicChecks.detect_cfa_anomaly(small))
            if sampled % 5 == 0:
                prnu_frames.append(frame)

            prev_gray = small_gray.copy()
            sampled += 1
            frame_idx += 1

        # Critical fix: dup_rate
        dup_rate = (dup_count / max(sampled - 1, 1)) * 100 if sampled > 1 else 0.0

        # Post-process
        results["prnu_analysis"] = ForensicChecks.extract_prnu(prnu_frames)
        results["copy_move_analysis"] = {"flagged": sum(r["flagged"] for r in cpm_results) > len(cpm_results) * 0.2}
        results["cfa_analysis"] = {"flagged": sum(r["flagged"] for r in cfa_results) > len(cfa_results) * 0.15}

        # Scoring
        score = 0
        issues = []
        if ela_vars and np.std(ela_vars) > 9.5: score += 28; issues.append(f"ELA inconsistency (σ={np.std(ela_vars):.1f})")
        if noise_vars and np.std(noise_vars) > 80: score += 25; issues.append(f"Noise inconsistency (σ={np.std(noise_vars):.1f})")
        if dup_rate > 2.5: score += 20; issues.append(f"Frame duplication ({dup_rate:.1f}%)")
        if motion_anomalies > 2: score += 22; issues.append("Motion spikes")
        if sampled >= 5 and (dct_spikes / (sampled // 5)) > 0.25: score += 26; issues.append("Double compression")

        for key in ["metadata", "deep_metadata", "gop_analysis", "metadata_inconsistency",
                    "prnu_analysis", "copy_move_analysis", "cfa_analysis"]:
            if results.get(key, {}).get("flagged"):
                score += 18
                issues.append(results[key].get("verdict", key.replace("_", " ").title()))

        verdict = "Authentic" if score < 40 else "Suspicious – Edited" if score < 65 else "Very Likely Manipulated" if score < 90 else "Highly Forged"
        results.update({
            "ela_std": round(np.std(ela_vars), 2) if ela_vars else None,
            "noise_std": round(np.std(noise_vars), 2) if noise_vars else None,
            "duplicate_rate_percent": round(dup_rate, 2),
            "motion_anomalies_count": motion_anomalies,
            "double_compression_rate": round((dct_spikes / max(sampled//5, 1)) * 100, 1),
            "final_verdict": verdict,
            "suspicion_score": min(score, 100),
            "issues_found": list(set(issues)) or ["No major issues"],
            "analyzed_frames": sampled
        })

        # Save report
        base_name = os.path.splitext(os.path.basename(self.video_path))[0]
        json_path = os.path.join(os.path.dirname(self.video_path), f"{base_name}_forensic_report.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(to_serializable(results), f, indent=4, ensure_ascii=False)

        logger.info(f"Report saved: {json_path}")
        logger.info(f"Verdict: {verdict} | Score: {score}/100")
        return results


if __name__ == "__main__":
    video_path = "backend/evidencemodule/ai_models/video_section/goodluckadded1.mp4"
    try:
        analyzer = VideoForensics(video_path)
        report = analyzer.run_full_analysis()
        print("\n" + "═"*70)
        print("       ENHANCED VIDEO FORENSIC REPORT – 2025")
        print("═"*70)
        print(f"File     : {os.path.basename(report['video_path'])}")
        print(f"Verdict  : {report['final_verdict']}")
        print(f"Score    : {report['suspicion_score']}/100")
        print(f"Issues   : {', '.join(report['issues_found'])}")
        print("═"*70)
    except Exception as e:
        logger.error(f"ERROR: {e}")
        print(f"ERROR: {e}")