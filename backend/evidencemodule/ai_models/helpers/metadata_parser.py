from PIL import Image, ExifTags
from PIL.ExifTags import TAGS, GPSTAGS
import numbers

def convert_gps_to_degrees(gps_data):
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

def sanitize_exif_value(value):
    if isinstance(value, bytes):
        try:
            return value.decode(errors="ignore")
        except:
            return str(value)
    elif isinstance(value, (int, float, str, bool)):
        return value
    elif isinstance(value, numbers.Number):
        return float(value)
    return str(value)

def extract_metadata_tags(image_path):
    metadata = {
        "software_used": "Unknown or Stripped",
        "gps_coordinates": None,
        "editing_trace_score": 0,
        "metadata_inconsistencies": [],
        "exif_data": {},
        "verdict": "Undetermined"
    }

    suspicious_keywords = ["photoshop", "snapseed", "lightroom", "gimp", "editor", "faceapp"]
    suspicious_tags = ["Software", "ProcessingSoftware", "Compression"]

    try:
        with Image.open(image_path) as image:
            exif_data = image._getexif()
            gps_data = {}
            has_make_model = False

            if exif_data:
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)

                    if tag == "GPSInfo":
                        for t in value:
                            sub_tag = GPSTAGS.get(t, t)
                            gps_data[sub_tag] = sanitize_exif_value(value[t])
                    else:
                        clean_val = sanitize_exif_value(value)
                        metadata["exif_data"][tag] = clean_val

                        if tag == "Software":
                            metadata["software_used"] = clean_val
                        if tag in ["Make", "Model"]:
                            has_make_model = True

            # GPS conversion
            if all(k in gps_data for k in ("GPSLatitude", "GPSLatitudeRef", "GPSLongitude", "GPSLongitudeRef")):
                lat, lon = convert_gps_to_degrees(gps_data)
                metadata["gps_coordinates"] = {
                    "latitude": lat,
                    "longitude": lon
                }

            
            for key, val in image.info.items():
                if 'software' in key.lower() and metadata["software_used"] == "Unknown or Stripped":
                    metadata["software_used"] = val

       
        sw_tag = str(metadata["software_used"]).lower()
        score = 0
        if any(k in sw_tag for k in suspicious_keywords):
            score += 40
        if "Compression" in metadata["exif_data"]:
            score += 15
        if not has_make_model:
            score += 15
        if "DateTimeOriginal" not in metadata["exif_data"] and "DateTime" in metadata["exif_data"]:
            score += 10
        metadata["editing_trace_score"] = min(score, 100)

       
        inconsistencies = []
        model = metadata["exif_data"].get("Model", "")
        if "photoshop" in sw_tag and "iPhone" in model:
            inconsistencies.append("iPhone + Photoshop tag (possible edit)")
        if metadata["software_used"] != "Unknown or Stripped" and not has_make_model:
            inconsistencies.append("Software tag but missing camera make/model")
        if "DateTime" in metadata["exif_data"] and "DateTimeOriginal" not in metadata["exif_data"]:
            inconsistencies.append("DateTime present but DateTimeOriginal missing")
        if "Compression" in metadata["exif_data"]:
            comp = metadata["exif_data"]["Compression"]
            if isinstance(comp, int) and comp != 6:
                inconsistencies.append(f"Unusual compression method: {comp}")
        metadata["metadata_inconsistencies"] = inconsistencies or ["None Detected"]

        
        if score <= 25 and not inconsistencies:
            metadata["verdict"] = "Clean"
        elif 25 < score <= 50 or len(inconsistencies) == 1:
            metadata["verdict"] = "Possibly Edited"
        else:
            metadata["verdict"] = "Likely Edited"

    except Exception as e:
        metadata["error"] = str(e)

    return metadata
