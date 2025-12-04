import cv2
import torch
from facenet_pytorch import MTCNN
from pathlib import Path
import numpy as np
from tqdm import tqdm
import pandas as pd

class FaceExtractor:
    def __init__(self, device='cuda', image_size=224):
        self.device = device
        self.image_size = image_size
        self.mtcnn = MTCNN(
            image_size=image_size,
            margin=20,
            keep_all=False,
            device=device,
            post_process=False
        )
    
    def extract_from_video(self, video_path, sample_rate=30, max_faces=50):
        """Extract faces from video"""
        cap = cv2.VideoCapture(str(video_path))
        faces = []
        frame_count = 0
        
        while cap.isOpened() and len(faces) < max_faces:
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_count % sample_rate == 0:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                face_tensor = self.mtcnn(frame_rgb)
                
                if face_tensor is not None:
                    # Convert tensor to numpy array
                    if torch.is_tensor(face_tensor):
                        face_np = face_tensor.cpu().numpy()
                        
                        # Handle different tensor formats
                        if face_np.ndim == 4:  # Batch dimension
                            face_np = face_np[0]
                        
                        # Convert from CHW to HWC if needed
                        if face_np.shape[0] == 3:  # CHW format (channels first)
                            face_np = np.transpose(face_np, (1, 2, 0))
                        
                        # Ensure values are in 0-255 range and uint8 dtype
                        if face_np.max() <= 1.0:
                            face_np = (face_np * 255).astype(np.uint8)
                        elif face_np.dtype != np.uint8:
                            face_np = face_np.astype(np.uint8)
                        
                        faces.append(face_np)
                    else:
                        # Already numpy array
                        faces.append(face_tensor)
            
            frame_count += 1
        
        cap.release()
        return faces