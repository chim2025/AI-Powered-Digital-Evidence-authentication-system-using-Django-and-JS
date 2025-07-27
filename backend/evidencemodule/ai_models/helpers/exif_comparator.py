'''from PIL import Image
from PIL.ExifTags import TAGS


def extract_exif_dict(image_path):
    image = Image.open(image_path)
    exif_data = image._getexif()
    if not exif_data:
        return {}

    exif = {}
    for tag_id, value in exif_data.items():
        tag = TAGS.get(tag_id, tag_id)
        exif[str(tag)] = str(value)
    return exif


def compare_exif(suspect_path, original_path):
    suspect_exif = extract_exif_dict(suspect_path)
    original_exif = extract_exif_dict(original_path)

    comparison = {}
    suspicious = {}

    all_keys = set(suspect_exif.keys()) | set(original_exif.keys())

    for key in all_keys:
        suspect_val = suspect_exif.get(key, "Not Found")
        original_val = original_exif.get(key, "Not Found")
        comparison[key] = {
            "suspect": suspect_val,
            "original": original_val,
            "match": suspect_val == original_val
        }
        if suspect_val != original_val:
            suspicious[key] = (original_val, suspect_val)

    return {
        "comparison": comparison,
        "suspicious_differences": suspicious,
        "suspicion_flagged": len(suspicious) > 0
    }
'''