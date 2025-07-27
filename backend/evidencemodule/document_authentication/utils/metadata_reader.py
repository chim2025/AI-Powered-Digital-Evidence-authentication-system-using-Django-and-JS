from .pdf_metadata_extractor import extract_pdf_metadata
from .docx_metadata_extractor import extract_docx_metadata

def extract_metadata(filepath):
    if filepath.endswith('.pdf'):
        return extract_pdf_metadata(filepath)
    elif filepath.endswith('.docx'):
        return extract_docx_metadata(filepath)
    else:
        raise ValueError("Unsupported file type for metadata extraction.")
