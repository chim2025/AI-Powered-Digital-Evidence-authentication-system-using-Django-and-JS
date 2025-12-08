from typing import Dict, Any

def prnu_detailed_verdict(prnu_result: Dict[str, Any],
                         use_strict_thresholds: bool = False) -> Dict[str, Any]:
    """
    Full PRNU forensic verdict with rich explanations, benchmarks and ratios.
    """
    # Hard-coded conservative thresholds (fallback)
    STRICT = {
        "consistent_camera":   {"mean_corr_min": 0.025, "std_corr_max": 0.050, "mad_corr_max": 0.030},
        "possible_tampering":  {"mean_corr_max": 0.018, "std_corr_min": 0.060, "mad_corr_min": 0.050}
    }

    # Extract values safely (handles both old and new key names)
    mean_corr    = prnu_result.get("mean_corr", 0.0)
    median_corr  = prnu_result.get("median_corr", 0.0)
    std_corr     = prnu_result.get("std_corr", 0.0)
    mad_corr     = prnu_result.get("mad_corr", 0.0)
    notes        = prnu_result.get("notes", prnu_result.get("status", ""))
    frames_used  = prnu_result.get("frames_used", prnu_result.get("num_frames", 0))

    # Use adaptive thresholds if available (from calibration)
    if not use_strict_thresholds and "threshold_suggestions" in prnu_result:
        thresh = prnu_result["threshold_suggestions"]
    else:
        thresh = STRICT

    cons = thresh["consistent_camera"]
    tamp = thresh["possible_tampering"]

    # Individual pass/fail checks
    checks = {
        "frames_sufficient"    : frames_used >= 15,
        "mean_corr_high_enough": mean_corr >= cons["mean_corr_min"],
        "mean_corr_too_low"    : mean_corr <= tamp["mean_corr_max"],
        "std_corr_low_enough"  : std_corr <= cons["std_corr_max"],
        "std_corr_too_high"    : std_corr >= tamp["std_corr_min"],
        "mad_corr_low_enough"  : mad_corr <= cons["mad_corr_max"],
        "mad_corr_too_high"    : mad_corr >= tamp["mad_corr_min"],
        "no_computation_error" : "error" not in notes.lower() and notes != "no_valid_patches"
    }

    # Scoring (0–100, higher = more authentic)
    score = 0
    score += 25 if checks["frames_sufficient"] else 0
    score += 30 if checks["mean_corr_high_enough"] else 0
    score += 15 if checks["std_corr_low_enough"] else 0
    score += 15 if checks["mad_corr_low_enough"] else 0
    if checks["mean_corr_too_low"] or checks["std_corr_too_high"] or checks["mad_corr_too_high"]:
        score -= 30
    score = max(0, min(100, score))

    # Final classification
    if not checks["no_computation_error"]:
        classification = "COMPUTATION FAILED"
        confidence = "N/A"
    elif score >= 85:
        classification = "HIGHLY CONSISTENT – VERY LIKELY AUTHENTIC"
        confidence = "Very High"
    elif score >= 70:
        classification = "CONSISTENT CAMERA – PROBABLY AUTHENTIC"
        confidence = "High"
    elif score >= 50:
        classification = "MODERATELY CONSISTENT – NEEDS REVIEW"
        confidence = "Medium"
    elif score >= 25:
        classification = "INCONSISTENT – POSSIBLE TAMPERING / MULTI-CAMERA"
        confidence = "Low"
    else:
        classification = "STRONG EVIDENCE OF TAMPERING OR HEAVY EDITING"
        confidence = "Very Low"

    benchmarks = {
        "mean_corr":   {"max_typical": 0.50, "min_typical": 0.02},
        "median_corr": {"max_typical": 0.50, "min_typical": 0.02},
        "std_corr":    {"max_typical": 0.50, "min_typical": 0.00},
        "mad_corr":    {"max_typical": 0.30, "min_typical": 0.00}
    }

  
    ratios = {
        "mean_corr":   round(mean_corr   / benchmarks["mean_corr"]["max_typical"],   4),
        "median_corr": round(median_corr / benchmarks["median_corr"]["max_typical"], 4),
        "std_corr":    round(std_corr    / benchmarks["std_corr"]["max_typical"],    4),
        "mad_corr":    round(mad_corr    / benchmarks["mad_corr"]["max_typical"],    4)
    }

 
    bullets = []

    if not checks["frames_sufficient"]:
        bullets.append(f"Only {frames_used} frames used (need ≥15)")

  
    if checks["mean_corr_high_enough"]:
        bullets.append(
            f"Mean corr {mean_corr:.4f} ≥ {cons['mean_corr_min']:.4f} → strong fingerprint "
            f"({ratios['mean_corr']:.3f} of typical max 0.50)"
        )
    else:
        bullets.append(
            f"Mean corr {mean_corr:.4f} < {cons['mean_corr_min']:.4f} → weak/no fingerprint "
            f"({ratios['mean_corr']:.3f} of typical max)"
        )

    # Std deviation
    if checks["std_corr_low_enough"]:
        bullets.append(
            f"Std dev {std_corr:.4f} ≤ {cons['std_corr_max']:.4f} → stable across frames "
            f"({ratios['std_corr']:.3f} of typical max 0.50)"
        )
    else:
        bullets.append(
            f"Std dev {std_corr:.4f} > {cons['std_corr_max']:.4f} → unstable (possible splicing) "
            f"({ratios['std_corr']:.3f} of typical max 0.50)"
        )

    # MAD
    if checks["mad_corr_low_enough"]:
        bullets.append(
            f"MAD {mad_corr:.4f} ≤ {cons['mad_corr_max']:.4f} → very uniform noise "
            f"({ratios['mad_corr']:.3f} of typical max 0.30)"
        )
    
    else:
        bullets.append(
            f"MAD {mad_corr:.4f} > {cons['mad_corr_max']:.4f} → outliers in noise pattern "
            f"({ratios['mad_corr']:.3f} of typical max 0.30)"
        )

    if checks["mean_corr_too_low"] or checks["std_corr_too_high"] or checks["mad_corr_too_high"]:
        bullets.append("One or more metrics fall into tampering range")


    return {
        "classification": classification,
        "confidence": confidence,
        "overall_score_0_100": round(score, 1),
        "mean_corr": round(mean_corr, 4),
        "median_corr": round(median_corr, 4),
        "std_corr": round(std_corr, 4),
        "mad_corr": round(mad_corr, 4),
        "frames_used": frames_used,
        "thresholds_used": "strict" if use_strict_thresholds else "adaptive/from_calibration",
        "detailed_checks": checks,
        "explanation_bullets": bullets,
        "benchmarks": benchmarks,
        "ratios": ratios,
        "raw_notes": notes
    }