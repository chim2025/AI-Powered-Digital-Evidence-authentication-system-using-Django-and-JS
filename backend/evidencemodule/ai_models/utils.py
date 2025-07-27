import time
from evidencemodule.ai_models.forgery_detector import detect_forgery_classical_with_visual
from evidencemodule.ai_models.helpers.metadata_parser import extract_metadata_tags

def full_image_forensic_analysis(image_path, streamer=None):
    result = {}

    def stream(msg, progress):
        if streamer:
            streamer({
                "progress": progress,
                "message": msg
            })

    
    stream("Extracting metadata...", 72)
    try:
        metadata = extract_metadata_tags(image_path)
        result["metadata_tags"] = metadata
        stream("Metadata extraction complete.", 80)
    except Exception as e:
        result["metadata_tags"] = {"error": str(e)}
        stream("Metadata extraction failed. But it's not a problem.", 80)

    
    stream("Running forgery detection...", 82)
    try:
        forgery = detect_forgery_classical_with_visual(image_path)
        result["forgery_detection"] = forgery
        stream("Forgery detection complete.", 95)
    except Exception as e:
        result["forgery_detection"] = {"error": str(e)}
        stream("Forgery detection failed. But it's not a problem.", 95)

    return result
