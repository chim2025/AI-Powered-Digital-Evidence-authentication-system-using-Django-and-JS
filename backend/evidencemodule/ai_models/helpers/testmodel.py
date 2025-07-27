
import os
os.environ["TRANSFORMERS_NO_TF"] = "1"
from transformers import pipeline
def load_ai_generated_detector():
    """
    Loads AI-generated image detectors using Hugging Face pipeline,
    forcing it to use PyTorch (and not TensorFlow).
    """

    # All these models are compatible with PyTorch
    ateeqq_pipe = pipeline(
        "image-classification",
        model="Ateeqq/ai-vs-human-image-detector",
        framework="pt"  # <== Force PyTorch
    )

    dima_pipe = pipeline(
        "image-classification",
        model="dima806/ai_vs_real_image_detection",
        framework="pt"  # <== Force PyTorch
    )

    dhruv_pipe = pipeline(
        "image-classification",
        model="DhruvJariwala/deepfake_vs_real_image_detection",
        framework="pt"  # <== Force PyTorch
    )

    return {
        "ateeqq": ateeqq_pipe,
        "dima806": dima_pipe,
        "dhruv": dhruv_pipe
    }


detectors = load_ai_generated_detector()
