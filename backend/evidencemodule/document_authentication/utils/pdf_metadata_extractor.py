import os
from PyPDF2 import PdfReader

def extract_pdf_metadata(filepath):
    if not os.path.isfile(filepath) or not filepath.endswith('.pdf'):
        raise ValueError("Invalid PDF file.")

    metadata = {}
    reader = PdfReader(filepath)
    if reader.metadata:
        for key, value in reader.metadata.items():
            clean_key = key.strip('/')
            metadata[clean_key] = str(value)

    # Additional useful attributes
    metadata['num_pages'] = len(reader.pages)
    if reader.trailer.get('/Encrypt'):
        metadata['encrypted'] = True
    else:
        metadata['encrypted'] = False

    return metadata
