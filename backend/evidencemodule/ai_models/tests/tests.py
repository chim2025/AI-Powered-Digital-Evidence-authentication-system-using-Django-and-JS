import os

import torch
from unittest.mock import patch, MagicMock
from evidencemodule.ai_models.deepfake_detector import (
    detect_faces,
    detect_ai_generated_image,
    analyze_deepfake
)


sample_image = "tests/sample_images/test_face.jpg"

def test_detect_faces_returns_list():
    faces, _ = detect_faces(sample_image, draw_faces=False)
    assert isinstance(faces, list)

@patch("evidencemodule.ai_models.deepfake_detector.ai_detectors", {
    "MockModel": lambda x: [{"label": "AI", "score": 0.99}]
})
def test_detect_ai_generated_image_mock():
    result = detect_ai_generated_image(sample_image)
    assert result["verdict"] in ["AI-Generated", "Human-Generated"]
    assert "models" in result

@patch("evidencemodule.ai_models.deepfake_detector.detect_faces", return_value=([], None))
@patch("evidencemodule.ai_models.deepfake_detector.detect_ai_generated_image", return_value={
    "verdict": "AI-Generated",
    "confidence": 0.95,
    "models": []
})
@patch("evidencemodule.ai_models.deepfake_detector.resnet_model")
@patch("evidencemodule.ai_models.deepfake_detector.efficientnet_model")
def test_analyze_deepfake_mock(resnet_mock, effnet_mock, ai_mock, face_mock):
    resnet_mock.return_value = MagicMock()
    effnet_mock.return_value = MagicMock()
    resnet_mock.return_value.__call__.return_value = torch.tensor([0.8])
    effnet_mock.return_value.__call__.return_value = torch.tensor([0.9])

    result = analyze_deepfake(sample_image)
    assert "verdict" in result
    assert "models_used" in result
