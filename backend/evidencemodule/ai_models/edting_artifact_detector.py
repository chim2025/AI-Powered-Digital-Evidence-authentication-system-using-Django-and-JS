# evidencemodule/ai_models/editing_artifact_detector_v2.py

from PIL import Image, ImageChops
import cv2
import numpy as np
import os
import uuid
from io import BytesIO

def save_as_jpeg(temp_path, image):
    """Convert image to JPEG format for ELA analysis."""
    jpeg_path = f"{os.path.splitext(temp_path)[0]}_converted_{uuid.uuid4().hex[:8]}.jpg"
    try:
        image.convert("RGB").save(jpeg_path, "JPEG", quality=90)
    except Exception as e:
        raise RuntimeError(f"JPEG Conversion Failed: {str(e)}")
    return jpeg_path

def error_level_analysis(image_path, save_ela_image=False):
    """Performs Error Level Analysis (ELA) on an image."""
    try:
        original = Image.open(image_path).convert("RGB")
    except Exception as e:
        return {"error": f"Unable to open image: {str(e)}"}

    # Convert to JPEG if needed
    if not image_path.lower().endswith(".jpg"):
        image_path = save_as_jpeg(image_path, original)

    ela_path = f"{os.path.splitext(image_path)[0]}_ela.jpg"

    try:
        original.save(ela_path, "JPEG", quality=90)
        ela_image = Image.open(ela_path)
    except Exception as e:
        return {"error": f"ELA save/open failed: {str(e)}"}

    try:
        diff = ImageChops.difference(original, ela_image)
        diff = diff.point(lambda x: min(x * 10, 255))  # Prevent overflow
        diff_array = np.array(diff)

        if save_ela_image:
            visual_path = f"{os.path.splitext(image_path)[0]}_ela_visual.jpg"
            diff.save(visual_path)

        ela_score = np.mean(diff_array)
        histogram_std = np.std(diff_array)
    except Exception as e:
        return {"error": f"ELA processing error: {str(e)}"}
    finally:
        if os.path.exists(ela_path):
            os.remove(ela_path)

    return {
        "ela_score": round(float(ela_score), 2),
        "ela_flagged": bool(ela_score > 15),
        "histogram_std": round(float(histogram_std), 2)
    }

def check_noise_pattern(image_path):
    """Detects editing noise based on Laplacian variance."""
    try:
        image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            raise ValueError("Could not load image into OpenCV.")
        if not isinstance(image_path, str) or not os.path.isfile(image_path):
            return {"error": f"Invalid image path: {image_path}"}
        lap_var = cv2.Laplacian(image, cv2.CV_64F).var()
        return {
            "laplacian_variance": round(float(lap_var), 2),
            "noise_flagged": bool(lap_var < 100)
        }
    except Exception as e:
        return {"error": f"Noise pattern error: {str(e)}"}

def detect_artifacts(image_path, save_ela_image=False):
    """Wrapper to detect ELA + noise artifacts."""
    ela = error_level_analysis(image_path, save_ela_image)
    noise = check_noise_pattern(image_path)

    return {
        "ela": ela,
        "noise": noise
    }
