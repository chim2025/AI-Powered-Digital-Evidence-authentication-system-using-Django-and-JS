# test_prnu_calibration_improved.py

import numpy as np
import cv2
from check_prnu import compute_prnu_from_frames
import matplotlib.pyplot as plt


video_files = [
    "backend/evidencemodule/ai_models/video_section/goodluckadded2.mp4",
]


def sample_frames(video_path, max_frames=1000, min_diff=1.0):
    cap = cv2.VideoCapture(video_path)
    frames, prev_gray = [], None
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    step = max(1, total // (max_frames*2))  # oversample for filtering
    idx = 0

    if total <= 0:
        print(f"[!] Invalid frame count: {video_path}")
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


def show_prnu_heatmap(prnu):
    norm = cv2.normalize(prnu, None, 0, 255, cv2.NORM_MINMAX)
    norm = norm.astype(np.uint8)
    cv2.imshow("PRNU Heatmap", norm)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

results = []

print("\n==========================================================")
print("             PRNU CALIBRATION TEST (IMPROVED)")
print("==========================================================")
print(f"Videos found: {len(video_files)}")
print("==========================================================\n")

for idx, video in enumerate(video_files, 1):
    name = video.split("/")[-1]
    print(f"[{idx}/{len(video_files)}] Processing: {name}")

    frames = sample_frames(video)
    if not frames:
        print(f"[!] Skipping {name} — no frames extracted\n")
        continue

    # Adaptive patch size
    height, width = frames[0].shape[:2]
    patch_size = 64
    if min(height, width) < 480:
        patch_size = 32
    elif min(height, width) > 1080:
        patch_size = 128

    prnu = compute_prnu_from_frames(
        frames=frames,
        resize=(256, 256),
        patch_size=patch_size,
        min_frames=15,
        use_wavelet=True
    )

    # Compute robust statistics
    mean_corr = prnu["mean_corr"]
    median_corr = prnu["median_corr"]
    std_corr = prnu["std_corr"]
    mad_corr = np.median(np.abs(np.array(prnu.get("correlations", [mean_corr])) - median_corr))

    print(f"        Frames used : {prnu['num_frames']}")
    print(f"        Patch size  : {patch_size}")
    print(f"        Mean Corr   : {mean_corr:.4f}")
    print(f"        Median Corr : {median_corr:.4f}")
    print(f"        Std Corr    : {std_corr:.4f}")
    print(f"        MAD Corr    : {mad_corr:.4f}")
    print(f"        Status      : {prnu['notes']}\n")

    # Optional: Display PRNU heatmap
    # show_prnu_heatmap(prnu['prnu_ref'])

    results.append({
        "video": name,
        "mean": mean_corr,
        "median": median_corr,
        "std": std_corr,
        "mad": mad_corr
    })

# ------------------------------
# Aggregate global statistics
# ------------------------------
means = np.array([r["mean"] for r in results if r["mean"] > 0])
medians = np.array([r["median"] for r in results if r["median"] > 0])
stds  = np.array([r["std"]  for r in results if r["std"] > 0])
mads  = np.array([r["mad"]  for r in results if r["mad"] > 0])

print("==========================================================")
print("                 GLOBAL PRNU SUMMARY")
print("==========================================================")

print(f"\nVideos analysed: {len(means)}")
if len(means) == 0:
    print("[!] No valid PRNU results obtained — probably too few frames.")
else:
    print("\n--- Mean Correlation ---")
    print(f"Min      : {means.min():.4f}")
    print(f"25% Quart: {np.percentile(means,25):.4f}")
    print(f"Median   : {np.median(means):.4f}")
    print(f"75% Quart: {np.percentile(means,75):.4f}")
    print(f"Max      : {means.max():.4f}")

    print("\n--- Std Correlation ---")
    print(f"Min      : {stds.min():.4f}")
    print(f"25% Quart: {np.percentile(stds,25):.4f}")
    print(f"Median   : {np.median(stds):.4f}")
    print(f"75% Quart: {np.percentile(stds,75):.4f}")
    print(f"Max      : {stds.max():.4f}")

    print("\n--- Median Absolute Deviation (MAD) ---")
    print(f"Min      : {mads.min():.4f}")
    print(f"25% Quart: {np.percentile(mads,25):.4f}")
    print(f"Median   : {np.median(mads):.4f}")
    print(f"75% Quart: {np.percentile(mads,75):.4f}")
    print(f"Max      : {mads.max():.4f}")

    # ------------------------------
    # Threshold Suggestions
    # ------------------------------
    print("\n==========================================================")
    print("             THRESHOLD SUGGESTIONS")
    print("==========================================================")

    low_mean = np.percentile(means, 20)
    high_std = np.percentile(stds, 80)
    high_mad = np.percentile(mads, 80)

    print("\nSuggested authenticity limits:")
    print(f"  CONSISTENT CAMERA PRNU:")
    print(f"       Mean Corr >= {max(low_mean, 0.025):.4f}")
    print(f"       Std  Corr <= {min(high_std, 0.050):.4f}")
    print(f"       MAD Corr <= {min(high_mad, 0.030):.4f}")

    print("\nSuggested tampering limits:")
    print(f"   POSSIBLE MULTI-SOURCE OR EDIT:")
    print(f"       Mean Corr <= {min(low_mean, 0.018):.4f}")
    print(f"       Std  Corr >= {max(high_std, 0.060):.4f}")
    print(f"       MAD Corr >= {max(high_mad, 0.050):.4f}")

# ------------------------------
# Quick ASCII Histogram
# ------------------------------
print("\n==========================================================")
print("                QUICK HISTOGRAM")
print("==========================================================")

def ascii_hist(data, bins):
    hist, edges = np.histogram(data, bins=bins)
    max_count = max(hist)
    for i in range(len(hist)):
        bar = "#" * int(40 * hist[i] / max_count)
        print(f"{edges[i]:.3f} – {edges[i+1]:.3f} | {bar}")

if len(means) > 0:
    print("\nMean Correlation Histogram:")
    ascii_hist(means, bins=8)

    print("\nStd Correlation Histogram:")
    ascii_hist(stds, bins=8)

    print("\nMAD Correlation Histogram:")
    ascii_hist(mads, bins=8)

print("\n==========================================================")
print("Calibration complete.")
print("==========================================================")
