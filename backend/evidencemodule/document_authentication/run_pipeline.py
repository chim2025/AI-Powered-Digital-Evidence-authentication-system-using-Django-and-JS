from .utils.file_reader import read_file
from .inference.detector import load_detector, classify_text
from .utils.metadata_reader import extract_metadata
from .utils.metadata_validator import detect_metadata_inconsistencies

MODEL_DIR = "C:/Users/Chimenka/Desktop/roberta-base-openai-detector"

def full_document_analysis(file_path):
    detector, tokenizer = load_detector(MODEL_DIR)
    text= read_file(file_path)
    result = classify_text(detector, tokenizer, text)
    metadata = extract_metadata(file_path)
    report = detect_metadata_inconsistencies(metadata, file_path=file_path)
    return {
        "detection_result": result,
        "report": report
    }

