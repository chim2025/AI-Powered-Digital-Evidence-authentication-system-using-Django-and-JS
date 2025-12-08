import torch
from torch.utils.data import Dataset
import pandas as pd
from pathlib import Path
import albumentations as A
from albumentations.pytorch import ToTensorV2

class DeepfakeDataset(Dataset):
    def __init__(self, metadata_csv, transform=None):
        self.df = pd.read_csv(metadata_csv)
        self.transform = transform
        
        # Build list of all face files
        self.face_paths = []
        self.labels = []
        
        for _, row in self.df.iterrows():
            face_dir = Path(row['face_dir'])
            label = int(row['label'])
            
            face_files = sorted(face_dir.glob('face_*.pt'))
            
            for face_file in face_files:
                self.face_paths.append(face_file)
                self.labels.append(label)
    
    def __len__(self):
        return len(self.face_paths)
    
    def __getitem__(self, idx):
        face = torch.load(self.face_paths[idx])
        label = self.labels[idx]
        
        # Convert to numpy for albumentations
        if isinstance(face, torch.Tensor):
            face = face.permute(1, 2, 0).numpy()
            face = (face * 255).astype('uint8')
        
        # Apply transforms
        if self.transform:
            face = self.transform(image=face)['image']
        else:
            face = ToTensorV2()(image=face)['image']
            face = face.float() / 255.0
        
        return face, label


def get_transforms(mode='train'):
    if mode == 'train':
        return A.Compose([
            A.Resize(224, 224),
            A.HorizontalFlip(p=0.5),
            A.Rotate(limit=15, p=0.3),
            A.RandomBrightnessContrast(p=0.3),
            A.GaussNoise(p=0.2),
            A.OneOf([
                A.ImageCompression(quality_lower=70, quality_upper=100, p=0.5),
                A.GaussianBlur(blur_limit=(3, 5), p=0.5),
            ], p=0.5),
            A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ToTensorV2()
        ])
    else:
        return A.Compose([
            A.Resize(224, 224),
            A.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ToTensorV2()
        ])