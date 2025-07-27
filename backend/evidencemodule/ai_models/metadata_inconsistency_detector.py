# evidencemodule/ai_models/metadata_inconsistency_detector.py
'''
import subprocess
import json
from datetime import datetime

def normalize_datetime(dt_str):
    try:
        return datetime.strptime(dt_str, "%Y:%m:%d %H:%M:%S")
    except Exception:
        return dt_str  

def extract_metadata_with_exiftool(image_path):
    try:
        output = subprocess.check_output(['exiftool', '-j', image_path])
        metadata = json.loads(output)[0]
    except Exception as e:
        return {"error": str(e)}

    anomalies = []
    suspicion_score = 0

   
    if "Software" not in metadata:
        anomalies.append("Software tag missing")
        suspicion_score += 10

    
    dt_original = metadata.get("DateTimeOriginal")
    dt_modify = metadata.get("ModifyDate")
    if dt_original and dt_modify:
        if normalize_datetime(dt_original) != normalize_datetime(dt_modify):
            anomalies.append("Timestamp mismatch: ModifyDate ≠ DateTimeOriginal")
            suspicion_score += 20

   
    model = metadata.get("Model", "").lower()
    software = metadata.get("Software", "").lower()
    if "photoshop" in software and "iphone" in model:
        anomalies.append("Unusual combo: Photoshop software on iPhone camera")
        suspicion_score += 25

   
    if "Compression" in metadata and metadata["Compression"] != "JPEG (old-style)":
        anomalies.append(f"Unexpected compression: {metadata['Compression']}")
        suspicion_score += 15

  
    if "Model" not in metadata:
        anomalies.append("Camera model missing")
        suspicion_score += 10

 
    if suspicion_score == 0:
        verdict = "Clean"
    elif suspicion_score <= 30:
        verdict = "Possibly Edited"
    else:
        verdict = "Likely Edited"

    return {
        "anomaly_count": len(anomalies),
        "anomalies": anomalies or ["None Detected"],
        "camera_model": metadata.get("Model", "Unknown"),
        "software_used": metadata.get("Software", "Unknown"),
        "suspicion_score": suspicion_score,
        "verdict": verdict
    }
    '''
