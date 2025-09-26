from PIL import Image, ImageChops
import cv2
import numpy as np
import os
import uuid
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def save_as_jpeg(temp_path, image):
    logger.info(f"Converting to JPEG: {temp_path}")
    jpeg_path = f"{os.path.splitext(temp_path)[0]}_converted_{uuid.uuid4().hex[:8]}.jpg"
    try:
        image.convert("RGB").save(jpeg_path, "JPEG", quality=90)
        return jpeg_path
    except Exception as e:
        logger.error(f"JPEG conversion failed: {str(e)}")
        raise

def error_level_analysis(image_path, save_ela_image=False):
    logger.info(f"Computing ELA for {image_path}")
    try:
        original = Image.open(image_path).convert("RGB")
        # Convert to JPEG if needed
        temp_path = image_path
        if not image_path.lower().endswith(".jpg"):
            temp_path = save_as_jpeg(image_path, original)
        ela_path = f"{os.path.splitext(temp_path)[0]}_ela.jpg"
        try:
            original.save(ela_path, "JPEG", quality=90)
            ela_image = Image.open(ela_path)
            diff = ImageChops.difference(original, ela_image)
            diff = diff.point(lambda x: min(x * 10, 255))
            diff_array = np.array(diff)
            if save_ela_image:
                visual_path = f"{os.path.splitext(temp_path)[0]}_ela_visual.jpg"
                diff.save(visual_path)
            ela_score = float(np.mean(diff_array))
            histogram_std = float(np.std(diff_array))
            return {
                "ela_score": round(ela_score, 2),
                "ela_flagged": bool(ela_score > 15),
                "histogram_std": round(histogram_std, 2)
            }
        finally:
            if temp_path != image_path and os.path.exists(temp_path):
                os.remove(temp_path)
            if os.path.exists(ela_path):
                os.remove(ela_path)
    except Exception as e:
        logger.error(f"ELA error: {str(e)}")
        return {"error": f"ELA processing error: {str(e)}"}

def check_noise_pattern(image_path):
    logger.info(f"Computing noise for {image_path}")
    try:
        image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            raise ValueError("Could not load image into OpenCV.")
        lap_var = float(cv2.Laplacian(image, cv2.CV_64F).var())
        return {
            "laplacian_variance": round(lap_var, 2),
            "noise_flagged": bool(lap_var < 100)
        }
    except Exception as e:
        logger.error(f"Noise error: {str(e)}")
        return {"error": f"Noise pattern error: {str(e)}"}

def detect_artifacts(image_path, save_ela_image=False):
    logger.info(f"Detecting artifacts for {image_path}")
    ela = error_level_analysis(image_path, save_ela_image)
    noise = check_noise_pattern(image_path)
    return {
        "ela": ela,
        "noise": noise
    }