import os
import time
import logging
import torch
from torchvision.models import resnet18, ResNet18_Weights
from transformers import pipeline
import timm

# ------------ Logging Setup ------------
logger = logging.getLogger("model_loader")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.FileHandler("model_loader.log")
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# ------------ Constants ------------
BASE_PATH = os.path.join(os.path.dirname(__file__), '..', 'checkpoints')


# ------------ Load ResNet18 ------------
def load_resnet18_model():
    try:
        start = time.perf_counter()
        weights = ResNet18_Weights.DEFAULT
        model = resnet18(weights=weights)
        model.fc = torch.nn.Linear(model.fc.in_features, 1)
        model.eval()
        logger.info(f"ResNet18 model loaded in {round((time.perf_counter() - start) * 1000, 2)} ms")
        return model
    except Exception as e:
        logger.exception("Failed to load ResNet18 model")
        raise


# ------------ Load EfficientNet-B4 ------------
def load_efficientnet_model(device='cpu'):
    try:
        start = time.perf_counter()
        model_path = os.path.join(BASE_PATH, 'efficientnet_b4_rwightman-7eb33cd5.pth')

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Checkpoint not found: {model_path}")

        model = timm.create_model('efficientnet_b4', pretrained=False, num_classes=1)
        state_dict = torch.load(model_path, map_location=torch.device(device))

        # Remove 'module.' prefix if present
        if any(k.startswith('module.') for k in state_dict.keys()):
            from collections import OrderedDict
            new_state_dict = OrderedDict()
            for k, v in state_dict.items():
                new_state_dict[k.replace('module.', '')] = v
            state_dict = new_state_dict

        model.load_state_dict(state_dict, strict=False)
        model.to(device)
        model.eval()
        logger.info(f"EfficientNet-B4 loaded in {round((time.perf_counter() - start) * 1000, 2)} ms")
        return model
    except Exception as e:
        logger.exception("Failed to load EfficientNet-B4 model")
        raise


# ------------ Load AI-Generated Image Classifiers (Hugging Face) ------------
def load_ai_generated_detector():
    try:
        start = time.perf_counter()

        ateeqq_pipe = pipeline(
            "image-classification",
            model="Ateeqq/ai-vs-human-image-detector",
            framework="pt"
        )

        dima_pipe = pipeline(
            "image-classification",
            model="dima806/ai_vs_real_image_detection",
            framework="pt"
        )

        dhruv_pipe = pipeline(
            "image-classification",
            model="DhruvJariwala/deepfake_vs_real_image_detection",
            framework="pt"
        )

        logger.info(f"Hugging Face AI classifiers loaded in {round((time.perf_counter() - start) * 1000, 2)} ms")

        return {
            "ateeqq": ateeqq_pipe,
            "dima806": dima_pipe,
            "dhruv": dhruv_pipe
        }

    except Exception as e:
        logger.exception("Failed to load Hugging Face AI-generated detectors")
        raise
