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
                face = self.mtcnn(frame_rgb)
                
                if face is not None:
                    faces.append(face)
            
            frame_count += 1
        
        cap.release()
        return faces