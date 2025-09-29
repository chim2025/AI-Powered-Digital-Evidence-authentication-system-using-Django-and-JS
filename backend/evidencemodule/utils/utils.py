# utils/file_utils.py
import os
from django.conf import settings

def ensure_upload_dir():
    upload_dir = settings.FILES_ROOT
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir
