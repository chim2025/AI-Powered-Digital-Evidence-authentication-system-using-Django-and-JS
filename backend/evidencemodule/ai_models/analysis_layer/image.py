from evidencemodule.ai_models.deepfake_detector import analyze_deepfake
from evidencemodule.ai_models.utils import full_image_forensic_analysis

def analyze_image(image_path):
    try:
        deepfake_result = analyze_deepfake(image_path)
        full_image_forensic_analysis_result = full_image_forensic_analysis(image_path)
        
        return {
            "status": "success",
            "file_type": "image",
            **deepfake_result,
            **full_image_forensic_analysis_result
              
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }