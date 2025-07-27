import os
import logging
import time
from PIL import Image
import torch
import torchvision.transforms as transforms
import mediapipe as mp
import cv2
from django.conf import settings

from evidencemodule.ai_models.helpers.model_loader import (
    load_resnet18_model,
    load_efficientnet_model,
    load_ai_generated_detector
)
from evidencemodule.ai_models.helpers.metadata_parser import extract_metadata_tags

# ----------- Logging Setup ------------
logger = logging.getLogger("deepfake_analysis")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.FileHandler("deepfake_analysis.log")
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# ----------- Model Loading ------------
resnet_model = load_resnet18_model()
efficientnet_model = load_efficientnet_model()
ai_detectors = load_ai_generated_detector()

transform = transforms.Compose([
    transforms.Resize((299, 299)),
    transforms.ToTensor()
])

mp_face_detection = mp.solutions.face_detection
mp_drawing = mp.solutions.drawing_utils

# ----------- Face Detection ------------
def detect_faces(image_path, draw_faces=True, output_path=None):
    image = cv2.imread(image_path)
    if image is None:
        return [], None

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    face_locations = []

    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detector:
        results = face_detector.process(image_rgb)
        if results.detections:
            for detection in results.detections:
                bboxC = detection.location_data.relative_bounding_box
                ih, iw, _ = image.shape
                x, y = int(bboxC.xmin * iw), int(bboxC.ymin * ih)
                w, h = int(bboxC.width * iw), int(bboxC.height * ih)
                face_locations.append((y, x + w, y + h, x))
                if draw_faces:
                    cv2.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 2)

    if draw_faces:
        if output_path is None:
            output_path = os.path.join(settings.MEDIA_ROOT, "face_maps", os.path.basename(image_path))
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cv2.imwrite(output_path, image)

    return face_locations, image


# ----------- AI Generation Detector ------------
def detect_ai_generated_image(image_path):
    predictions = []
    try:
        for name, pipe in ai_detectors.items():
            result = pipe(image_path)[0]
            predictions.append({
                "model": name,
                "label": result["label"],
                "confidence": round(result["score"], 4)
            })

        ai_votes = sum(1 for pred in predictions if "ai" in pred["label"].lower())
        human_votes = sum(1 for pred in predictions if "human" in pred["label"].lower())
        avg_confidence = sum(pred["confidence"] for pred in predictions) / len(predictions)
        verdict = "AI-Generated" if ai_votes > human_votes else "Human-Generated"

        return {
            "verdict": verdict,
            "confidence": round(avg_confidence, 4),
            "models": predictions
        }

    except Exception as e:
        logger.exception("AI detection failed")
        return {"error": f"AI detection failed: {str(e)}"}


# ----------- Deepfake Analysis Main Function ------------
def analyze_deepfake(image_path):
    try:
        timing = {}
        start_total = time.perf_counter()

        # Load and preprocess image
        img = Image.open(image_path).convert("RGB")
        img_tensor = transform(img).unsqueeze(0)

        # Deepfake model inference
        start_infer = time.perf_counter()
        with torch.no_grad():
            resnet_score = torch.sigmoid(resnet_model(img_tensor)).item()
            efficientnet_score = torch.sigmoid(efficientnet_model(img_tensor)).item()
        end_infer = time.perf_counter()

        avg_score = (resnet_score + efficientnet_score) / 2
        tampering = avg_score > 0.6
        verdict = "Forged" if tampering else "Authentic"

        # Face detection
        start_face = time.perf_counter()
        face_output_path = os.path.join(settings.MEDIA_ROOT, "face_maps", os.path.basename(image_path))
        face_locations, _ = detect_faces(image_path, draw_faces=True, output_path=face_output_path)
        end_face = time.perf_counter()

        # AI-generated detection
        start_ai = time.perf_counter()
        ai_result = detect_ai_generated_image(image_path)
        end_ai = time.perf_counter()

        ai_label = ai_result.get("verdict", "Unknown")
        ai_conf = ai_result.get("confidence", 0.0)
        face_count = len(face_locations)

        # Final timing log
        timing["total"] = round((time.perf_counter() - start_total) * 1000, 2)
        timing["inference"] = round((end_infer - start_infer) * 1000, 2)
        timing["face_detection"] = round((end_face - start_face) * 1000, 2)
        timing["ai_classification"] = round((end_ai - start_ai) * 1000, 2)

        logger.info(f"Analyzed {image_path} | Verdict: {verdict} | "
                    f"Inference: {timing['inference']}ms | "
                    f"Face Detection: {timing['face_detection']}ms | "
                    f"AI Classification: {timing['ai_classification']}ms | "
                    f"Total: {timing['total']}ms")

        return {
            "models_used": ["ResNet-18", "EfficientNet", "Ateeqq", "Dima806", "DhruvJariwala"],
            "verdict": verdict,
            "tampering_detected": tampering,
            "confidence_score": round(avg_score * 100, 2),
            "manipulation_type": "Deepfake / Face Manipulation",
            "detected_regions": face_count,
            "model_scores": {
                "resnet18": round(resnet_score * 100, 2),
                "efficientnet": round(efficientnet_score * 100, 2)
            },
            "ai_generated": ai_label,
            "ai_generated_label": ai_label,
            "ai_generated_confidence": round(ai_conf * 100, 2),
            "ai_individual_models": ai_result.get("models", []),
            "content_type": "Face Detected" if face_count > 0 else "Object/Scene",
            "face_preview": f"face_maps/{os.path.basename(image_path)}",
            "face_count": face_count,
            "timing_ms": timing
        }

    except Exception as e:
        logger.exception("Deepfake analysis failed")
        return {"error": str(e)}
