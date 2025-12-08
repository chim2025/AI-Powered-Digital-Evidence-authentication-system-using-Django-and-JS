# Installation Guide - Deepfake Detection System

**For**: Forensic Team at Proforce Intelligence Systems  
**System**: Deepfake Detection for Black Faces  
**Version**: 1.0  
**Date**: November 2025

---

## 📋 System Requirements

### Hardware
- **GPU**: NVIDIA RTX 3050 (6GB VRAM) or better
- **RAM**: 16GB minimum, 32GB recommended
- **Storage**: 100GB free space
- **CPU**: Modern multi-core processor

### Software
- **OS**: Windows 10/11 with WSL Ubuntu 24.04
- **Python**: 3.10
- **CUDA**: 12.1
- **Conda**: Miniconda or Anaconda

### Network
- **Internet**: Required for initial setup
- **Ports**: 8000 (API), 8501 (Dashboard)

---

## 🚀 Installation Steps

### Step 1: Install Miniconda (If Not Installed)

1. Download Miniconda from: https://docs.conda.io/en/latest/miniconda.html
2. Run installer (accept defaults)
3. Restart terminal

### Step 2: Create Conda Environment

```cmd
conda create -n deepfake python=3.10 -y
conda activate deepfake
```

### Step 3: Install PyTorch with CUDA

```cmd
pip install torch==2.5.1+cu121 torchvision==0.20.1+cu121 --index-url https://download.pytorch.org/whl/cu121 --break-system-packages
```

### Step 4: Install Core Dependencies

```cmd
pip install timm opencv-python facenet-pytorch albumentations pandas scikit-learn numpy==1.26.4 --break-system-packages
```

### Step 5: Install API Dependencies

```cmd
pip install fastapi uvicorn python-multipart --break-system-packages
```

### Step 6: Install Dashboard Dependencies

```cmd
pip install streamlit pillow --break-system-packages
```

### Step 7: Set Up Project Structure

```cmd
cd C:\Users\[USERNAME]\Desktop
mkdir deepfake
cd deepfake

REM Create required directories
mkdir models\checkpoints
mkdir data\processed\your_videos
mkdir data\processed\fakes
mkdir src\models
mkdir src\data
mkdir src\evaluation
```

### Step 8: Copy Project Files

Copy the following files to the `deepfake` directory:

**Core Detection (Phase 6):**
- `predict_video.py`
- `test_predict_video.py`

**Visual Explanations (Phase 7):**
- `gradcam.py`
- `analyze_video.py`

**API Backend (Phase 8):**
- `api_main.py`
- `database.py`

**Dashboard (Phase 9):**
- `dashboard.py`

**Additional Tools:**
- `batch_test.py`
- `test_api_client.py`

**Source Modules (in src/ directory):**
- `src/models/architecture.py`
- `src/data/dataset.py`
- `src/data/face_extraction.py`
- `src/evaluation/metrics.py`

**Model File:**
- `models/checkpoints/best_model.pth` (75MB)

### Step 9: Verify Installation

```cmd
conda activate deepfake

REM Test Python imports
python -c "import torch; print('PyTorch:', torch.__version__)"
python -c "import torch; print('CUDA available:', torch.cuda.is_available())"
python -c "import streamlit; print('Streamlit:', streamlit.__version__)"

REM Test model loading
python -c "from src.models.architecture import DeepfakeDetector; print('Model import: OK')"
```

Expected output:
```
PyTorch: 2.5.1+cu121
CUDA available: True
Streamlit: 1.29.0
Model import: OK
```

---

## ⚙️ Configuration

### API Configuration

Edit `api_main.py`:

```python
# Line 59 - Change API key (IMPORTANT!)
API_KEY = "YOUR-SECURE-API-KEY-HERE"

# Line 54 - Max file size (default 500MB)
MAX_FILE_SIZE = 500 * 1024 * 1024

# Line 426 - Port (default 8000)
port=8000
```

### Dashboard Configuration

Edit `dashboard.py`:

```python
# Line 33 - API URL (if different server)
API_BASE_URL = "http://localhost:8000"

# Line 34 - API Key (must match api_main.py)
API_KEY = "YOUR-SECURE-API-KEY-HERE"
```

---

## 🧪 Testing Installation

### Test 1: Core Detection

```cmd
python test_predict_video.py
```

Expected: All tests pass (3/6 or 6/6)

### Test 2: API Server

Terminal 1:
```cmd
python api_main.py
```

Terminal 2:
```cmd
python test_api_client.py --health
```

Expected: Status 200, "healthy"

### Test 3: Dashboard

```cmd
streamlit run dashboard.py
```

Expected: Browser opens to http://localhost:8501

### Test 4: End-to-End

1. Start API: `python api_main.py`
2. Start Dashboard: `streamlit run dashboard.py`
3. Upload test video via dashboard
4. Verify results appear

---

## 📁 Final Directory Structure

```
C:\Users\[USERNAME]\Desktop\deepfake\
├── api_main.py
├── database.py
├── dashboard.py
├── predict_video.py
├── gradcam.py
├── analyze_video.py
├── batch_test.py
├── test_predict_video.py
├── test_api_client.py
│
├── models\
│   └── checkpoints\
│       └── best_model.pth          (75MB)
│
├── src\
│   ├── models\
│   │   └── architecture.py
│   ├── data\
│   │   ├── dataset.py
│   │   └── face_extraction.py
│   └── evaluation\
│       └── metrics.py
│
├── uploads\                        (created automatically)
├── results\                        (created automatically)
├── api_database.db                 (created automatically)
└── api.log                         (created automatically)
```

---

## 🔒 Security Checklist

Before production deployment:

- [ ] Change default API key
- [ ] Set up firewall rules (ports 8000, 8501)
- [ ] Configure user access controls
- [ ] Set up backup procedures
- [ ] Enable request logging
- [ ] Set up SSL/HTTPS (if remote access)

---
