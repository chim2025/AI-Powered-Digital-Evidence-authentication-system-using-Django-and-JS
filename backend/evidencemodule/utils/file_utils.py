from .utils import ensure_upload_dir
import uuid
import os
def save_uploaded_file(uploaded_file):
    """Save uploaded file to permanent storage and return full path."""
    upload_dir = ensure_upload_dir()

    ext = uploaded_file.name.split('.')[-1]
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, 'wb') as out_file:
        for chunk in uploaded_file.chunks():
            out_file.write(chunk)

    return file_path