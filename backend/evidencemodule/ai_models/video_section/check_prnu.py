# detectors_prnu_improved.py
import numpy as np
import cv2
import math
import warnings

try:
    import pywt
    _HAS_PYWT = True
except Exception:
    _HAS_PYWT = False
    warnings.warn("pywt not available: using Gaussian denoising fallback (less ideal).")

def _wavelet_denoise(image, wavelet='db2', level=2, sigma_factor=1.0):
    """Wavelet shrinkage denoiser using pywt."""
    coeffs = pywt.wavedec2(image, wavelet=wavelet, level=level)
    detail_coeffs = coeffs[-1]
    detail_arr = np.concatenate([c.flatten() for c in detail_coeffs])
    sigma = np.median(np.abs(detail_arr)) / 0.6745 + 1e-12
    thr = sigma * math.sqrt(2 * math.log(image.size)) * sigma_factor

    new_coeffs = [coeffs[0]]
    for detail in coeffs[1:]:
        new_detail = tuple(pywt.threshold(d, thr, mode='soft') for d in detail)
        new_coeffs.append(new_detail)

    denoised = pywt.waverec2(new_coeffs, wavelet=wavelet)
    denoised = denoised.astype(np.float32)
    denoised = denoised[:image.shape[0], :image.shape[1]]
    return denoised

def _gaussian_denoise(image, ksize=3):
    """Fallback Gaussian blur denoiser."""
    return cv2.GaussianBlur(image, (ksize, ksize), 0).astype(np.float32)

def _extract_residual(gray_image, use_wavelet=True):
    """Compute residual: image - denoised version, zero-mean."""
    if use_wavelet and _HAS_PYWT:
        den = _wavelet_denoise(gray_image)
    else:
        den = _gaussian_denoise(gray_image, ksize=5)
    residual = gray_image.astype(np.float32) - den
    residual -= np.mean(residual)
    return residual

def compute_prnu_from_frames(frames,
                             resize=(256,256),
                             patch_size=64,
                             min_frames=15,
                             use_wavelet=True,
                             use_motion_weight=True,
                             ):

    if len(frames) < min_frames:
        return {
            "mean_corr": 0.0,
            "std_corr": 0.0,
            "median_corr": 0.0,
            "per_frame_corrs": [],
            "num_frames": len(frames),
            "notes": f"insufficient_frames (need >= {min_frames})",
            "prnu_ref": None
        }

    residuals = []
    motion_weights = []

    prev_gray = None
    for f in frames:
        gray = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
        if resize is not None:
            gray = cv2.resize(gray, resize, interpolation=cv2.INTER_AREA)

        res = _extract_residual(gray, use_wavelet=use_wavelet)
        std_res = np.std(res)
        if std_res < 1e-6:
            std_res = 1e-6
        residuals.append(res / std_res)

       
        if use_motion_weight:
            if prev_gray is not None:
                flow = cv2.calcOpticalFlowFarneback(prev_gray, gray, None,
                                                    0.5, 3, 15, 3, 5, 1.2, 0)
                motion = np.mean(np.sqrt(flow[...,0]**2 + flow[...,1]**2))
            else:
                motion = 1.0
            motion_weights.append(motion)
            prev_gray = gray
        else:
            motion_weights.append(1.0)

    residuals = np.stack(residuals, axis=0)
    motion_weights = np.array(motion_weights)
    motion_weights /= np.sum(motion_weights)  

   
    prnu_ref = np.average(residuals, axis=0, weights=motion_weights)

    H, W = prnu_ref.shape
    ps = patch_size
    per_patch_corrs = []
    per_frame_corrs = []

    for k in range(residuals.shape[0]):
        frame_corrs = []
        for i in range(0, H - ps + 1, ps):
            for j in range(0, W - ps + 1, ps):
                ref_patch = prnu_ref[i:i+ps, j:j+ps].flatten()
                frm_patch = residuals[k, i:i+ps, j:j+ps].flatten()
                if np.std(ref_patch) < 1e-6 or np.std(frm_patch) < 1e-6:
                    continue
                corr = np.corrcoef(ref_patch, frm_patch)[0,1]
                if not np.isnan(corr):
                    frame_corrs.append(corr)
                    per_patch_corrs.append(corr)
        per_frame_corrs.append(np.mean(frame_corrs) if frame_corrs else 0.0)

    if len(per_patch_corrs) == 0:
        return {
            "mean_corr": 0.0,
            "std_corr": 0.0,
            "median_corr": 0.0,
            "per_frame_corrs": per_frame_corrs,
            "num_frames": len(frames),
            "notes": "no_valid_patches",
            "prnu_ref": prnu_ref
        }

    corrs = np.array(per_patch_corrs)
    return {
        "mean_corr": round(np.mean(corrs),4),
        "median_corr": round(np.median(corrs),4),
        "std_corr": round(np.std(corrs),4),
        "per_frame_corrs": per_frame_corrs,
        "num_frames": len(frames),
        "notes": "ok",
        "prnu_ref": prnu_ref
    }
