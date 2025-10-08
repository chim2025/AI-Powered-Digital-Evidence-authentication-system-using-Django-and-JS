import subprocess
import json
import datetime
import hashlib
import logging
import math
import os
import uuid
from typing import Dict, List, Tuple, Optional

# Set up logging for auditability
logging.basicConfig(level=logging.INFO, filename='metadata_audit.log', format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def normalize_datetime(dt_str: str) -> Optional[datetime.datetime]:
    """Parse and normalize datetime strings."""
    try:
        return datetime.datetime.strptime(dt_str.split('+')[0].split('-')[0], "%Y:%m:%d %H:%M:%S")
    except Exception:
        return None

def calculate_entropy(data: str) -> float:
    """Calculate Shannon entropy for a string to detect hidden data."""
    if not data:
        return 0.0
    entropy = 0
    for x in set(data):
        p_x = float(data.count(x)) / len(data)
        entropy -= p_x * math.log2(p_x)
    return entropy

def validate_gps(gps_data: Dict) -> Tuple[Optional[float], Optional[float], Optional[str]]:
    """Validate GPS coordinates for plausibility."""
    try:
        lat_ref = gps_data.get("GPSLatitudeRef")
        lon_ref = gps_data.get("GPSLongitudeRef")
        lat = gps_data.get("GPSLatitude")
        lon = gps_data.get("GPSLongitude")
        if lat and lon and lat_ref and lon_ref:
            lat_val = float(lat.split()[0]) + float(lat.split()[2][:-1]) / 60 + float(lat.split()[4][:-1]) / 3600
            lon_val = float(lon.split()[0]) + float(lon.split()[2][:-1]) / 60 + float(lon.split()[4][:-1]) / 3600
            if lat_ref != "N":
                lat_val = -lat_val
            if lon_ref != "E":
                lon_val = -lon_val
            if -90 <= lat_val <= 90 and -180 <= lon_val <= 180:
                return lat_val, lon_val, None
            return None, None, "Invalid GPS coordinates"
        return None, None, "Missing GPS data"
    except Exception as e:
        return None, None, f"GPS validation error: {str(e)}"

def extract_metadata_with_exiftool(image_path: str) -> Dict:
    """Extract metadata using exiftool with selective tags and advanced anomaly detection."""
    analysis_id = str(uuid.uuid4())
    logger.info(f"Starting metadata analysis for {image_path} (Analysis ID: {analysis_id})")
    
    # Define safe tags to avoid large binary data
    safe_tags = [
        'FileType', 'FileModifyDate', 'DateTimeOriginal', 'ModifyDate', 'Make', 'Model', 
        'Software', 'Compression', 'ExifVersion', 'FlashpixVersion', 'UserComment',
        'GPSLatitude', 'GPSLatitudeRef', 'GPSLongitude', 'GPSLongitudeRef', 'GPSAltitude'
    ]
    
    try:
        # Run exiftool with specific tags
        cmd = ['exiftool', '-j', '-n'] + [f'-{tag}' for tag in safe_tags] + [image_path]
        output = subprocess.check_output(cmd, timeout=30)
        metadata = json.loads(output)[0]
    except subprocess.TimeoutExpired:
        logger.error(f"exiftool timed out for {image_path}")
        return {"error": "Metadata extraction timed out", "analysis_id": analysis_id}
    except Exception as e:
        logger.error(f"Metadata extraction failed for {image_path}: {str(e)}")
        return {"error": f"Metadata extraction error: {str(e)}", "analysis_id": analysis_id}

    anomalies = []
    suspicion_score = 0.0
    confidence_scores = []

    # Initialize metadata fields
    result = {
        "analysis_id": analysis_id,
        "anomaly_count": 0,
        "anomalies": [],
        "camera_model": metadata.get("Model", "Unknown"),
        "software_used": metadata.get("Software", "Unknown"),
        "suspicion_score": 0,
        "verdict": "Clean",
        "metadata": metadata,
        "confidence_scores": []
    }

    # Anomaly checks
    # 1. Missing critical tags
    if "Software" not in metadata:
        anomalies.append("Software tag missing")
        suspicion_score += 10
        confidence_scores.append({"anomaly": "Software tag missing", "confidence": 0.9})
    
    if "Model" not in metadata or "Make" not in metadata:
        anomalies.append("Camera Make or Model missing")
        suspicion_score += 15
        confidence_scores.append({"anomaly": "Camera Make or Model missing", "confidence": 0.85})

    # 2. Timestamp consistency
    dt_original = metadata.get("DateTimeOriginal")
    dt_modify = metadata.get("ModifyDate")
    file_modify = metadata.get("FileModifyDate")
    timestamps = [t for t in [dt_original, dt_modify, file_modify] if t]
    parsed_timestamps = [normalize_datetime(t) for t in timestamps if normalize_datetime(t)]
    
    if len(parsed_timestamps) > 1:
        max_diff = max((t2 - t1).total_seconds() for t1, t2 in zip(parsed_timestamps[:-1], parsed_timestamps[1:]))
        if max_diff > 3600:  # More than 1 hour
            hours = max_diff / 3600
            anomalies.append(f"Timestamp mismatch: {hours:.1f} hours difference")
            suspicion_score += min(20 + hours / 24, 40)  # Scale with time difference
            confidence_scores.append({"anomaly": f"Timestamp mismatch ({hours:.1f} hours)", "confidence": 0.95 if hours > 24 else 0.75})

    # 3. Suspicious software and device combinations
    model = metadata.get("Model", "").lower()
    software = metadata.get("Software", "").lower()
    suspicious_software = ["photoshop", "lightroom", "snapseed", "gimp", "faceapp"]
    if any(s in software for s in suspicious_software):
        if "iphone" in model or "samsung" in model:
            anomalies.append(f"Unusual combo: {software} on {model} device")
            suspicion_score += 25
            confidence_scores.append({"anomaly": f"Unusual software-device combo", "confidence": 0.9})
        else:
            anomalies.append(f"Suspicious software detected: {software}")
            suspicion_score += 15
            confidence_scores.append({"anomaly": f"Suspicious software: {software}", "confidence": 0.7})

    # 4. Compression analysis
    compression = metadata.get("Compression", "")
    if compression and compression != "JPEG (old-style)":
        anomalies.append(f"Unexpected compression: {compression}")
        suspicion_score += 15
        confidence_scores.append({"anomaly": f"Unexpected compression: {compression}", "confidence": 0.8})

    # 5. Entropy analysis for hidden data
    user_comment = metadata.get("UserComment", "")
    if user_comment and calculate_entropy(user_comment) > 6:  # High entropy suggests hidden data
        anomalies.append("High entropy in UserComment, possible steganography")
        suspicion_score += 20
        confidence_scores.append({"anomaly": "High entropy in UserComment", "confidence": 0.85})

    # 6. GPS validation
    gps_data = {
        "GPSLatitude": metadata.get("GPSLatitude"),
        "GPSLatitudeRef": metadata.get("GPSLatitudeRef"),
        "GPSLongitude": metadata.get("GPSLongitude"),
        "GPSLongitudeRef": metadata.get("GPSLongitudeRef")
    }
    lat, lon, gps_error = validate_gps(gps_data)
    if gps_error:
        anomalies.append(gps_error)
        suspicion_score += 10
        confidence_scores.append({"anomaly": gps_error, "confidence": 0.75})
    elif lat and lon:
        result["gps_coordinates"] = {"latitude": lat, "longitude": lon}

    # 7. File system metadata check
    try:
        file_stat = os.stat(image_path)
        file_mtime = datetime.datetime.fromtimestamp(file_stat.st_mtime)
        if dt_original and abs((file_mtime - normalize_datetime(dt_original)).total_seconds()) > 86400:  # 1 day
            anomalies.append("File system timestamp differs significantly from EXIF")
            suspicion_score += 15
            confidence_scores.append({"anomaly": "File system vs EXIF timestamp mismatch", "confidence": 0.8})
    except Exception as e:
        logger.warning(f"File system check failed for {image_path}: {str(e)}")

    # Verdict calculation
    result["anomaly_count"] = len(anomalies)
    result["anomalies"] = anomalies or ["None Detected"]
    result["suspicion_score"] = min(round(suspicion_score, 2), 100)
    result["confidence_scores"] = confidence_scores
    
    if suspicion_score == 0:
        result["verdict"] = "Clean"
    elif suspicion_score <= 30:
        result["verdict"] = "Possibly Edited"
    else:
        result["verdict"] = "Likely Edited"

    logger.info(f"Completed analysis for {image_path} (ID: {analysis_id}): {result['verdict']}, Score: {suspicion_score}")
    return result