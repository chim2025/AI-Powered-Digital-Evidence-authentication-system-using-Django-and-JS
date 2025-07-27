# evidencemodule/ai_models/prnu_checker.py
'''
import cv2
import numpy as np
from skimage.restoration import denoise_tv_chambolle
from scipy.signal import correlate2d
import json
import os
import piexif
from PIL import Image


def extract_prnu(image_path):
    """Extracts PRNU noise pattern using total variation denoising"""
    img = cv2.imread(image_path)
    img = cv2.resize(img, (512, 512))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32) / 255.0

    residual = img - denoise_tv_chambolle(img, weight=0.1, multichannel=True)
    return residual


def calculate_prnu_similarity(prnu1, prnu2):
    """Computes mean cross-correlation similarity between PRNU patterns"""
    similarities = []
    for c in range(3): 
        correlation = correlate2d(prnu1[:, :, c], prnu2[:, :, c], mode='valid')
        score = np.max(correlation)
        similarities.append(score)
    return float(np.mean(similarities))


def extract_metadata_tags(image_path):
    """Extract camera model and software using piexif (local method)"""
    metadata = {}
    try:
        img = Image.open(image_path)
        exif_data = img.info.get('exif')
        if exif_data:
            exif_dict = piexif.load(exif_data)
            model = exif_dict["0th"].get(piexif.ImageIFD.Model)
            software = exif_dict["0th"].get(piexif.ImageIFD.Software)
            if model:
                metadata["camera_model"] = model.decode('utf-8', errors='ignore')
            if software:
                metadata["software_used"] = software.decode('utf-8', errors='ignore')
        else:
            metadata["camera_model"] = "Unknown"
            metadata["software_used"] = "Unknown"
    except Exception as e:
        metadata["camera_model"] = "Unknown"
        metadata["software_used"] = f"Error: {str(e)}"
    return metadata


def is_metadata_suspicious(metadata):
    """Simple rules to flag metadata inconsistency"""
    if "Photoshop" in metadata.get("software_used", ""):
        return True
    if metadata.get("camera_model") in ["Unknown", ""]:
        return True
    return False


def check_image_authenticity(test_image_path, reference_prnu_dict):
    """
    Compares the PRNU of a test image with multiple reference patterns.
    Also checks metadata consistency.
    
    Parameters:
    - test_image_path: str
    - reference_prnu_dict: dict { "Camera Model": prnu_array }
    
    Returns:
    - dict (JSON-compatible) for frontend
    """

    try:
        test_prnu = extract_prnu(test_image_path)
        metadata = extract_metadata_tags(test_image_path)

        best_score = 0
        matched_camera = "Unknown"

        for cam_model, ref_prnu in reference_prnu_dict.items():
            score = calculate_prnu_similarity(test_prnu, ref_prnu)
            if score > best_score:
                best_score = score
                matched_camera = cam_model

        
        camera_match = matched_camera == metadata.get("camera_model", "Unknown")
        tampering_suspected = (best_score < 0.15 or not camera_match or is_metadata_suspicious(metadata))

        return {
            "similarity_score": round(best_score, 4),
            "matched_reference_camera": matched_camera,
            "camera_match": camera_match,
            "tampering_suspected": tampering_suspected,
            "metadata": metadata,
        }

    except Exception as e:
        return {"error": f"PRNU/Metadata analysis failed: {str(e)}"}
'''