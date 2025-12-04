import torch
import torch.nn as nn
import timm

class DeepfakeDetector(nn.Module):
    def __init__(self, model_name='efficientnet_b4', pretrained=True, dropout=0.3):
        super().__init__()
        
        self.backbone = timm.create_model(
            model_name,
            pretrained=pretrained,
            num_classes=0,
            global_pool=''
        )
        
        with torch.no_grad():
            dummy = torch.randn(1, 3, 224, 224)
            features = self.backbone(dummy)
            feature_dim = features.shape[1]
        
        self.global_pool = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(dropout),
            nn.Linear(feature_dim, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(512, 2)
        )
    
    def forward(self, x):
        features = self.backbone(x)
        features = self.global_pool(features)
        logits = self.classifier(features)
        return logits