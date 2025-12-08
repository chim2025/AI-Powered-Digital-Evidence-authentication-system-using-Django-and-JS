
import os
import numpy as np
import cv2
from .check_prnu import compute_prnu_from_frames
from typing import Union, List, Dict, Any

def calibrate_prnu_from_videos(video_input: Union[str, List[str]]) -> Dict[str, Any]:
    """
    Runs your full PRNU calibration on one or more videos.
    Returns pure JSON-serializable data. No prints. No plots.
    """
    if isinstance(video_input, str):
        video_files = [video_input]
    else:
        video_files = video_input

    results = {
        "analysis_date": np.datetime64('now').astype(str),
        "total_videos_requested": len(video_files),
        "videos_processed": [],
        "global_statistics": {},
        "threshold_suggestions": {},
        "histograms": {}
    }

    individual_results = []

    for video_path in video_files:
        if not cv2.VideoCapture(video_path).isOpened():
            individual_results.append({
                "video": video_path,
                "error": "Could not open video file"
            })
            continue

        frames = sample_frames(video_path)
        if len(frames) == 0:
            individual_results.append({
                "video": video_path,
                "error": "No frames extracted"
            })
            continue

        # Adaptive patch size (your logic)
        h, w = frames[0].shape[:2]
        patch_size = 64
        if min(h, w) < 480:
            patch_size = 32
        elif min(h, w) > 1080:
            patch_size = 128

        prnu = compute_prnu_from_frames(
            frames=frames,
            resize=(256, 256),
            patch_size=patch_size,
            min_frames=15,
            use_wavelet=True
        )

        if "mean_corr" not in prnu:
            individual_results.append({
                "video": video_path,
                "error": "PRNU computation failed"
            })
            continue

        # MAD calculation (your exact method)
        correlations = np.array(prnu.get("correlations", []))
        if len(correlations) == 0:
            correlations = np.array([prnu["mean_corr"]])
        mad_corr = float(np.median(np.abs(correlations - prnu["median_corr"])))
        

       

        

        video_result = {
            "video": os.path.basename(video_path),
            "full_path": video_path,
            "frames_used": prnu["num_frames"],
            "patch_size": patch_size,
            "mean_corr": prnu["mean_corr"],
            "median_corr": prnu["median_corr"],
            "std_corr": prnu["std_corr"],
            "mad_corr": mad_corr,
            
            "status": prnu["notes"]
        }
        

        individual_results.append(video_result)

    results["videos_processed"] = individual_results

    # Extract valid numeric results
    valid = [r for r in individual_results if "mean_corr" in r]
    if len(valid) == 0:
        results["global_statistics"] = {"error": "No valid PRNU results"}
        return results

    means = np.array([r["mean_corr"] for r in valid])
    medians = np.array([r["median_corr"] for r in valid])
    stds = np.array([r["std_corr"] for r in valid])
    mads = np.array([r["mad_corr"] for r in valid])

    # Global stats
    results["global_statistics"] = {
        "videos_analyzed": len(valid),
        "mean_correlation": {
            "min": float(means.min()),
            "p25": float(np.percentile(means, 25)),
            "median": float(np.median(means)),
            "p75": float(np.percentile(means, 75)),
            "max": float(means.max())
        },
        "std_correlation": {
            "min": float(stds.min()),
            "p25": float(np.percentile(stds, 25)),
            "median": float(np.median(stds)),
            "p75": float(np.percentile(stds, 75)),
            "max": float(stds.max())
        },
        "mad_correlation": {
            "min": float(mads.min()),
            "p25": float(np.percentile(mads, 25)),
            "median": float(np.median(mads)),
            "p75": float(np.percentile(mads, 75)),
            "max": float(mads.max())
        }
    }

    # Threshold suggestions (your logic)
    low_mean = np.percentile(means, 20)
    high_std = np.percentile(stds, 80)
    high_mad = np.percentile(mads, 80)

    results["threshold_suggestions"] = {
        "consistent_camera": {
            "mean_corr_min": max(low_mean, 0.025),
            "std_corr_max": min(high_std, 0.050),
            "mad_corr_max": min(high_mad, 0.030)
        },
        "possible_tampering": {
            "mean_corr_max": min(low_mean, 0.018),
            "std_corr_min": max(high_std, 0.060),
            "mad_corr_min": max(high_mad, 0.050)
        }
    }

    # ASCII-style histograms as data
    def hist_data(arr, bins=8):
        hist, edges = np.histogram(arr, bins=bins)
        return [
            {"range": f"{edges[i]:.4f}–{edges[i+1]:.4f}", "count": int(hist[i])}
            for i in range(len(hist))
        ]

    results["histograms"] = {
        "mean_corr": hist_data(means),
        "std_corr": hist_data(stds),
        "mad_corr": hist_data(mads)
    }

    return results


# Your original helper function (unchanged, silent)
def sample_frames(video_path, max_frames=1000, min_diff=1.0):
    cap = cv2.VideoCapture(video_path)
    frames, prev_gray = [], None
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    step = max(1, total // (max_frames * 2))
    idx = 0
    if total <= 0:
        cap.release()
        return []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if idx % step == 0:
            gray = cv2.cvtColor(cv2.resize(frame, (320, 240)), cv2.COLOR_BGR2GRAY)
            if prev_gray is None or np.mean(cv2.absdiff(gray, prev_gray)) > min_diff:
                frames.append(frame)
                prev_gray = gray
                if len(frames) >= max_frames:
                    break
        idx += 1
    cap.release()
    return frames


