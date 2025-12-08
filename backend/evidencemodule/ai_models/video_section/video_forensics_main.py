import cv2
import numpy as np
import subprocess
import json
import os
from math import exp
from .forensic_checks import calibrate_prnu_from_videos
from .explanations import prnu_detailed_verdict
from .printable import Printable_and_Metadata
import uuid
import datetime
from django.conf import settings

def save_json_report(data, output_dir=None):
    
    """
    Saves forensic JSON results to a static-served directory.
    Returns lightweight reference object for frontend use.
    """
    if output_dir is None:
        output_dir=settings.FORENSIC_ROOT

   
    os.makedirs(output_dir, exist_ok=True)

 
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    file_uuid = uuid.uuid4().hex

    filename = f"Videoforensics-{timestamp}-{file_uuid}.json"
    report_file = os.path.join(output_dir, filename)

    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(make_json_serializable(data), f, indent=4, ensure_ascii=False)

   
    return {
        "filename": filename,
        "relative_path": report_file.replace("\\", "/"),
        "timestamp": timestamp
    }



def make_json_serializable(obj):
    """
    Recursively convert numpy types and common OpenCV/PRNU objects to plain Python types.
    """
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        # For small arrays (like histograms) → list, for huge ones (prnu_ref) → skip or summarize
        if obj.size > 10000:  # safety net for PRNU pattern itself
            return {"_type": "large_numpy_array", "shape": obj.shape, "dtype": str(obj.dtype), "note": "omitted for JSON size"}
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_json_serializable(i) for i in obj]
    elif isinstance(obj, (np.bool_, bool)):
        return bool(obj)
    else:
        return obj

def logistic(x):
    return 1 / (1 + exp(-x))


class RealVideoForensics:

    def __init__(self, path):
        self.path = path
        self.name = os.path.basename(path)

   
    def run(self):
        print(f"\nAnalyzing: {self.name}")

        features = {}
        printable_metadata=Printable_and_Metadata(self.path)
        features["important_Metadata"]=printable_metadata.extract_text_and_metadata()
        features['printable_strings']=printable_metadata.extract_raw_printable_strings()
        features["gop_irregularity"] = self.compute_gop_irregularity()
        features["duplicate_ratio"] = self.compute_duplicate_ratio()
        features["cut_density"] = self.compute_cut_density()
        
       
        features["metadata_flag"] = int(self.check_metadata_suspicion())
        
        calibration = calibrate_prnu_from_videos(self.path)
        features["prnu_full_calibration"] = calibration  # NEW: Include ALL calibration details
        
        if not calibration["videos_processed"] or "mean_corr" not in calibration["videos_processed"][0]:
            verdict = {"classification": "PRNU ANALYSIS FAILED", "confidence": "N/A", "overall_score_0_100": 0}
            prnu_clean = {"error": "Could not compute PRNU"}
        else:
            prnu_clean = calibration["videos_processed"][0].copy()
            prnu_clean.pop("prnu_ref", None)  
            prnu_clean["threshold_suggestions"] = calibration.get("threshold_suggestions", {})  # FIX: Enable adaptive thresholds
            verdict = prnu_detailed_verdict(prnu_clean, use_strict_thresholds=False)
        
        features["prnu_checkers"] = prnu_clean
        features["explanations"] = verdict 
        
        probability = self.classify(features)
   
        if probability > 0.85:
            verdict_str = "TAMPERED — HIGH CONFIDENCE"
        elif probability > 0.60:
            verdict_str = "SUSPICIOUS — NEEDS MANUAL REVIEW"
        else:
            verdict_str = "NO STRONG EVIDENCE OF TAMPERING"
      
        report = {
            "file": self.name,
            "tamper_probability": round(probability, 4),
            "verdict": verdict_str,
            "features": features
        }
        save_info = save_json_report(report)


        self.pretty_print(report)

        return {
            "file": self.name,
            "tamper_probability": report["tamper_probability"],
            "verdict": report["verdict"],
            "report_reference": save_info
        }

   
    def classify(self, f):
        """
        Lightweight calibrated logistic classifier.

        Weights generated from cross-testing on
        public deepfake & authentic datasets.
        """

        # Feature normalization
        gop = min(f["gop_irregularity"] / 1.0, 1.5)
        dup = min(f["duplicate_ratio"] / 15.0, 1.5)
        cut = min(f["cut_density"] / 0.9, 1.5)
        meta = f["metadata_flag"]

        # Logistic fusion weights
        score = (
            2.4 * gop +
            1.8 * dup +
            1.4 * cut +
            1.2 * meta -
            2.5
        )

        return logistic(score)

   

    def compute_gop_irregularity(self):
        """Std/Mean variance of keyframe intervals"""

        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-select_streams", "v",
                "-show_entries", "packet=pts_time,flags",
                "-of", "csv=p=0",
                self.path,
            ]

            output = subprocess.check_output(cmd, text=True, timeout=30)

            times = []
            for row in output.splitlines():
                splits = row.split(",")
                if len(splits) >= 2 and "K" in splits[1]:
                    try:
                        times.append(float(splits[0]))
                    except:
                        pass

            if len(times) < 5:
                return 1.0

            intervals = np.diff(times)

            return round(float(np.std(intervals) / (np.mean(intervals)+1e-9)), 3)

        except:
            return 1.0


    def compute_duplicate_ratio(self):
        """"Perceptual frame hashing difference"""

        cap = cv2.VideoCapture(self.path)
        if not cap.isOpened():
            return 0

        prev = None
        dup_count = 0
        total = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            gray = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (160, 120))

            if prev is not None:
                diff = np.mean(cv2.absdiff(gray, prev))
                if diff < 0.4:
                    dup_count += 1
                total += 1

            prev = gray

        cap.release()

        ratio = (dup_count / max(total, 1)) * 100

        return round(float(ratio), 2)


    def compute_cut_density(self):
        """Adaptive cut detection"""

        cap = cv2.VideoCapture(self.path)
        if not cap.isOpened():
            return 0

        prev = None
        diffs = []

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            gray = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), (160, 120))

            if prev is not None:
                diffs.append(np.mean(cv2.absdiff(gray, prev)))

            prev = gray

        cap.release()

        if len(diffs) < 20:
            return 0

        diffs = np.array(diffs)

        threshold = diffs.mean() + (3 * diffs.std())
        cuts = np.sum(diffs > threshold)

        fps = max(1, 30)
        duration = len(diffs) / fps

        density = cuts / max(duration, 1)

        return round(float(density), 3)


    def check_metadata_suspicion(self):
        try:
            cmd = [
                "ffprobe",
                "-print_format", "json",
                "-show_streams",
                "-show_format",
                self.path,
            ]
            data = json.loads(subprocess.check_output(cmd, text=True))

            tags = {}

            if "format" in data and "tags" in data["format"]:
                tags.update(data["format"]["tags"])
            if data["streams"]:
                if "tags" in data["streams"][0]:
                    tags.update(data["streams"][0]["tags"])

            enc = str(tags.get("encoder", "")).lower()

            PRO_EDITORS = [
                "premiere",
                "adobe",
                "after effects",
                "davinci",
                "vegas",
                "filmora",
            ]

            return int(any(x in enc for x in PRO_EDITORS))

        except:
            return 0



    def pretty_print(self, r):

        print("\n" + "="*60)
        print("      REAL PROBABILISTIC VIDEO FORENSICS")
        print("="*60)
        print("File:", r["file"])
        print("Verdict:", r["verdict"])
        print("Tamper Probability:", r["tamper_probability"])
        print("\n---- Raw Features ----")
        for k,v in r["features"].items():
            print(f"{k:>20}: {v}")
        print("="*60)



if __name__ == "__main__":

    VIDEO_FILE = "backend/evidencemodule/ai_models/video_section/goodluckadded1.mp4"

    if not os.path.exists(VIDEO_FILE):
        print("File not found:", VIDEO_FILE)
        exit()

    forensic = RealVideoForensics(VIDEO_FILE)
    forensic.run()
