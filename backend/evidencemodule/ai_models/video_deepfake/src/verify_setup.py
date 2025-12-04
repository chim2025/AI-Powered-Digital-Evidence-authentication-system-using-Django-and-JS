import torch
from pathlib import Path
import pandas as pd
import sys

print("="*50)
print("SETUP VERIFICATION")
print("="*50)

errors = []

# 1. Check GPU
print("\n1. Checking GPU...")
if torch.cuda.is_available():
    print(f"   GPU: {torch.cuda.get_device_name(0)}")
else:
    errors.append("GPU not available")
    print("   ERROR: GPU not available")

# 2. Check files exist
print("\n2. Checking files...")
required_files = [
    'src/data/dataset.py',
    'src/models/architecture.py',
    'src/evaluation/metrics.py',
    'train.py',
    'data/metadata/train.csv',
    'data/metadata/val.csv',
    'data/metadata/test.csv'
]

for file in required_files:
    if Path(file).exists():
        print(f"   {file}")
    else:
        errors.append(f"Missing: {file}")
        print(f"   ERROR: Missing {file}")

# 3. Check data
print("\n3. Checking data...")
try:
    train_df = pd.read_csv('data/metadata/train.csv')
    val_df = pd.read_csv('data/metadata/val.csv')
    test_df = pd.read_csv('data/metadata/test.csv')
    
    print(f"   Train: {len(train_df)} videos")
    print(f"   Val: {len(val_df)} videos")
    print(f"   Test: {len(test_df)} videos")
except Exception as e:
    errors.append(f"Data error: {e}")
    print(f"   ERROR: {e}")

# 4. Test dataset loading
print("\n4. Testing dataset loading...")
try:
    sys.path.append(str(Path.cwd()))
    from src.data.dataset import DeepfakeDataset, get_transforms
    
    dataset = DeepfakeDataset('data/metadata/train.csv', get_transforms('train'))
    print(f"   Dataset size: {len(dataset)} faces")
    
    # Load one sample
    face, label = dataset[0]
    print(f"   Sample shape: {face.shape}, label: {label}")
except Exception as e:
    errors.append(f"Dataset error: {e}")
    print(f"   ERROR: {e}")

# 5. Test model creation
print("\n5. Testing model creation...")
try:
    from src.models.architecture import DeepfakeDetector
    
    model = DeepfakeDetector()
    model = model.cuda()
    
    # Test forward pass
    dummy = torch.randn(2, 3, 224, 224).cuda()
    output = model(dummy)
    print(f"   Model output shape: {output.shape}")
except Exception as e:
    errors.append(f"Model error: {e}")
    print(f"   ERROR: {e}")

# 6. Test dataloader
print("\n6. Testing dataloader...")
try:
    from torch.utils.data import DataLoader
    
    loader = DataLoader(dataset, batch_size=8, shuffle=True, num_workers=2)
    images, labels = next(iter(loader))
    print(f"   Batch shape: {images.shape}")
    print(f"   Labels shape: {labels.shape}")
except Exception as e:
    errors.append(f"DataLoader error: {e}")
    print(f"   ERROR: {e}")

# Summary
print("\n" + "="*50)
if len(errors) == 0:
    print("ALL CHECKS PASSED")
    print("Ready to train!")
else:
    print(f"FOUND {len(errors)} ERRORS:")
    for error in errors:
        print(f"  - {error}")
print("="*50)