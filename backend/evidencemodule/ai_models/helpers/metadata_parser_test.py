import exifread
import hachoir.parser
import hachoir.metadata
import PyPDF2
import mimetypes
import numbers
import datetime
import os
import logging

# Set up logging to debug hanging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def sanitize_exif_value(value):
    """Sanitize metadata values for consistency."""
    if isinstance(value, bytes):
        try:
            return value.decode(errors="ignore")
        except:
            return str(value)
    elif isinstance(value, (list, tuple)):
        return [sanitize_exif_value(v) for v in value]
    elif isinstance(value, (int, float, str, bool)):
        return value
    elif isinstance(value, numbers.Number):
        return float(value)
    return str(value)

def convert_gps_to_degrees(gps_data):
    """Convert GPS coordinates to decimal degrees."""
    def convert(coord):
        try:
            d, m, s = coord
            return float(d) + float(m) / 60.0 + float(s) / 3600.0
        except Exception:
            return 0.0
    try:
        lat = convert(gps_data["GPSLatitude"])
        if gps_data.get("GPSLatitudeRef") != "N":
            lat = -lat
        lon = convert(gps_data["GPSLongitude"])
        if gps_data.get("GPSLongitudeRef") != "E":
            lon = -lon
        return round(lat, 6), round(lon, 6)
    except Exception:
        return None, None

def parse_timestamp(timestamp):
    """Parse timestamp strings to datetime for comparison."""
    try:
        # Handle formats like '2025:09:02 15:07:19' or '2025:09:02 15:07:19+00:00'
        return datetime.datetime.strptime(timestamp.split('+')[0].split('-')[0], "%Y:%m:%d %H:%M:%S")
    except:
        return None

def extract_metadata_tags(file_path):
    print("---------------------Runnign from Test----------------------")
    logger.info(f"Processing file: {file_path}")
    metadata = {
        "software_used": "Unknown or Stripped",
        "gps_coordinates": None,
        "editing_trace_score": 0,
        "metadata_inconsistencies": [],
        "exif_data": {},
        "verdict": "Undetermined",
        "forensic_data": {},
        "file_type": None,
        "note": None
    }
    suspicious_keywords = ["photoshop", "snapseed", "lightroom", "gimp", "editor", "faceapp"]
    mime_type, _ = mimetypes.guess_type(file_path)
    metadata["file_type"] = mime_type or "Unknown"
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        if 'image' in (mime_type or ''):
            # Image metadata with exifread
            with open(file_path, "rb") as f:
                tags = exifread.process_file(f, details=False)
            gps_data = {}
            has_make_model = False
            for tag, value in tags.items():
                if tag == "JPEGThumbnail":
                    continue  # Skip JPEGThumbnail to prevent inclusion
                clean_val = sanitize_exif_value(value)
                metadata["exif_data"][tag] = clean_val
                if "Software" in tag:
                    metadata["software_used"] = clean_val
                if "Make" in tag or "Model" in tag:
                    has_make_model = True
                if "GPS" in tag:
                    if "GPSLatitude" in tag:
                        gps_data["GPSLatitude"] = [float(x.num) / float(x.den) for x in value.values]
                    elif "GPSLatitudeRef" in tag:
                        gps_data["GPSLatitudeRef"] = str(value)
                    elif "GPSLongitude" in tag:
                        gps_data["GPSLongitude"] = [float(x.num) / float(x.den) for x in value.values]
                    elif "GPSLongitudeRef" in tag:
                        gps_data["GPSLongitudeRef"] = str(value)
            if all(k in gps_data for k in ("GPSLatitude", "GPSLatitudeRef", "GPSLongitude", "GPSLongitudeRef")):
                lat, lon = convert_gps_to_degrees(gps_data)
                if lat is not None and lon is not None:
                    metadata["gps_coordinates"] = {"latitude": lat, "longitude": lon}
            metadata["note"] = "Image metadata extracted (e.g., EXIF tags)"
        elif 'video' in (mime_type or '') or 'audio' in (mime_type or ''):
            # Video/audio metadata with hachoir
            parser = hachoir.parser.createParser(file_path)
            if not parser:
                raise ValueError("Unable to parse video/audio file")
            with parser:
                hachoir_meta = hachoir.metadata.extractMetadata(parser)
                if hachoir_meta:
                    for item in hachoir_meta:
                        key = item.key
                        value = sanitize_exif_value(item.value)
                        metadata["exif_data"][key] = value
                        if key.lower() in ("software", "creator"):
                            metadata["software_used"] = value
                    metadata["note"] = f"{'Video' if 'video' in mime_type else 'Audio'} metadata extracted (e.g., codec, duration)"
        elif 'pdf' in (mime_type or ''):
            # PDF metadata with PyPDF2
            with open(file_path, "rb") as f:
                pdf = PyPDF2.PdfReader(f)
                info = pdf.metadata or {}
                for key, value in info.items():
                    clean_key = key.lstrip('/')
                    metadata["exif_data"][clean_key] = sanitize_exif_value(value)
                    if clean_key.lower() in ("producer", "creator"):
                        metadata["software_used"] = value
                metadata["note"] = "Document metadata extracted (e.g., PDF properties)"
        # Tampering detection
        score = 0
        inconsistencies = []
        sw_tag = str(metadata["software_used"]).lower()
        if any(k in sw_tag for k in suspicious_keywords):
            score += 40
            inconsistencies.append(f"Suspicious software: {metadata['software_used']}")
        if 'image' in (mime_type or '') and (not metadata["exif_data"].get("Image Make") and not metadata["exif_data"].get("Image Model")):
            score += 15
            inconsistencies.append("Missing camera Make or Model")
        if 'video' in (mime_type or '') and not metadata["exif_data"].get("duration"):
            score += 10
            inconsistencies.append("Missing video duration")
        if 'audio' in (mime_type or '') and not metadata["exif_data"].get("author") and not metadata["exif_data"].get("title"):
            score += 10
            inconsistencies.append("Missing audio Author or Title")
        if 'pdf' in (mime_type or '') and (not metadata["exif_data"].get("Author") or not metadata["exif_data"].get("CreationDate")):
            score += 10
            inconsistencies.append("Missing PDF Author or CreationDate")
        timestamps = [
            metadata["exif_data"].get("DateTimeOriginal"),
            metadata["exif_data"].get("DateTime"),
            metadata["exif_data"].get("FileModifyDate"),
            metadata["exif_data"].get("CreationDate"),
            metadata["exif_data"].get("ModifyDate")
        ]
        timestamps = [ts for ts in timestamps if ts]
        parsed_timestamps = [parse_timestamp(ts) for ts in timestamps if parse_timestamp(ts)]
        if len(parsed_timestamps) > 1:
            time_diff = max((t2 - t1).total_seconds() for t1, t2 in zip(parsed_timestamps[:-1], parsed_timestamps[1:]))
            if time_diff > 3600:
                score += 20
                inconsistencies.append(f"Timestamp mismatch: {time_diff/3600:.1f} hours")
        if 'image' in (mime_type or ''):
            ela_score = 0  # Replace: your_ela_function(file_path)
            noise_score = 0  # Replace: your_noise_function(file_path)
            metadata["forensic_data"] = {"ela_score": ela_score, "noise_score": noise_score}
            if ela_score > 30:
                score += 30
                inconsistencies.append(f"ELA tampering score: {ela_score:.1f}")
            if noise_score > 20:
                score += 20
                inconsistencies.append(f"Noise variance high: {noise_score:.1f}")
        metadata["editing_trace_score"] = min(score, 100)
        metadata["metadata_inconsistencies"] = inconsistencies or ["None Detected"]
        metadata["verdict"] = (
            "Clean" if score <= 25 and not inconsistencies else
            "Possibly Modified" if score <= 50 or len(inconsistencies) == 1 else
            "Likely Modified"
        )
        print("------------------ended---------------")
        print(metadata)
    except Exception as e:
        logger.error(f"Metadata extraction error: {str(e)}")
        metadata["error"] = f"Metadata extraction error: {str(e)}"
    logger.info(f"Completed processing: {file_path}")
    return metadata