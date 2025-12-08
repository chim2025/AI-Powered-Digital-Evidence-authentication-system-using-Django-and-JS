"""
FastAPI Backend for Deepfake Detection System
Provides REST API for video upload, processing, and results retrieval

Author: Gbotemi
Date: November 2025
Phase: 8 - API Backend
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, BackgroundTasks, Header
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import shutil
from pathlib import Path
from datetime import datetime
import uuid
import json
import logging
from enum import Enum

# Import our detection pipeline
import sys
sys.path.append(str(Path(__file__).parent))

from analyze_video import analyze_video_with_gradcam
from database import Database, JobStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Deepfake Detection API",
    description="REST API for video deepfake detection with Grad-CAM visualizations",
    version="1.0.0"
)

# Add CORS middleware (adjust origins for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
db = Database('api_database.db')

# Configuration
UPLOAD_DIR = Path("uploads")
RESULTS_DIR = Path("results")
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB
ALLOWED_EXTENSIONS = {'.mp4', '.avi', '.mov'}
API_KEY = "your-secret-api-key-change-this"  # TODO: Use environment variable

# Create directories
UPLOAD_DIR.mkdir(exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)


# Pydantic models
class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    created_at: str
    completed_at: Optional[str]
    video_filename: str
    error_message: Optional[str]


class JobResultResponse(BaseModel):
    job_id: str
    video_filename: str
    prediction: str
    confidence: float
    fake_face_count: int
    real_face_count: int
    fake_face_percentage: float
    processing_time: float
    heatmaps: List[str]
    created_at: str
    completed_at: str


# Authentication
def verify_api_key(x_api_key: str = Header(...)):
    """Verify API key from header"""
    if x_api_key != API_KEY:
        logger.warning(f"Invalid API key attempt: {x_api_key[:10]}...")
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


# Background processing function
def process_video_task(job_id: str, video_path: str, output_dir: str):
    """
    Background task to process video
    Updates database with progress and results
    """
    try:
        logger.info(f"[{job_id}] Starting video processing: {video_path}")
        
        # Update status to processing
        db.update_job_status(job_id, JobStatus.PROCESSING, progress=10)
        
        # Run analysis (Phase 6 + Phase 7)
        result = analyze_video_with_gradcam(
            video_path,
            output_dir=output_dir,
            generate_heatmaps=True,
            confidence_threshold=0.7,
            max_heatmaps=5,
            verbose=False  # Don't print to console
        )
        
        db.update_job_status(job_id, JobStatus.PROCESSING, progress=90)
        
        # Extract results
        video_result = result['video_result']
        heatmap_paths = result['heatmap_paths']
        
        # Store results in database
        results_data = {
            'prediction': video_result.prediction,
            'confidence': video_result.confidence,
            'fake_face_count': video_result.fake_face_count,
            'real_face_count': video_result.real_face_count,
            'fake_face_percentage': video_result.fake_face_percentage,
            'processing_time': video_result.processing_time,
            'heatmaps': [str(Path(p).name) for p in heatmap_paths],
            'json_path': result['json_path']
        }
        
        db.store_results(job_id, results_data)
        
        # Mark as completed
        db.update_job_status(job_id, JobStatus.COMPLETED, progress=100)
        
        logger.info(f"[{job_id}] Processing completed successfully")
        logger.info(f"[{job_id}] Result: {video_result.prediction} ({video_result.confidence*100:.1f}%)")
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[{job_id}] Processing failed: {error_msg}")
        db.update_job_status(job_id, JobStatus.FAILED, error_message=error_msg)


# API Endpoints

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Deepfake Detection API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "upload": "POST /api/upload",
            "job_status": "GET /api/jobs/{job_id}",
            "results": "GET /api/results/{job_id}",
            "heatmap": "GET /api/heatmap/{job_id}/{frame_id}",
            "health": "GET /health"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "connected" if db else "disconnected"
    }


@app.post("/api/upload", response_model=JobResponse)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    api_key: str = Depends(verify_api_key)
):
    """
    Upload a video file for deepfake analysis
    
    Returns a job_id that can be used to track progress and retrieve results
    """
    logger.info(f"Upload request received: {file.filename}")
    
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Save uploaded file
    upload_path = UPLOAD_DIR / f"{job_id}{file_ext}"
    
    try:
        with open(upload_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save upload: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file")
    
    # Create output directory for results
    output_dir = RESULTS_DIR / job_id
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Create job in database
    db.create_job(
        job_id=job_id,
        video_filename=file.filename,
        video_path=str(upload_path),
        output_dir=str(output_dir)
    )
    
    # Add background task
    background_tasks.add_task(
        process_video_task,
        job_id,
        str(upload_path),
        str(output_dir)
    )
    
    logger.info(f"[{job_id}] Job created for: {file.filename}")
    
    return JobResponse(
        job_id=job_id,
        status="queued",
        message=f"Video uploaded successfully. Use job_id to track progress."
    )


@app.get("/api/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get the status of a processing job
    
    Returns current status, progress, and any error messages
    """
    job = db.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobStatusResponse(
        job_id=job['job_id'],
        status=job['status'],
        progress=job['progress'],
        created_at=job['created_at'],
        completed_at=job['completed_at'],
        video_filename=job['video_filename'],
        error_message=job['error_message']
    )


@app.get("/api/results/{job_id}", response_model=JobResultResponse)
async def get_results(
    job_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Get the analysis results for a completed job
    
    Returns prediction, confidence, statistics, and heatmap filenames
    """
    job = db.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job['status'] != JobStatus.COMPLETED.value:
        raise HTTPException(
            status_code=400,
            detail=f"Job not completed yet. Status: {job['status']}"
        )
    
    results = db.get_results(job_id)
    
    if not results:
        raise HTTPException(status_code=404, detail="Results not found")
    
    return JobResultResponse(
        job_id=job_id,
        video_filename=job['video_filename'],
        prediction=results['prediction'],
        confidence=results['confidence'],
        fake_face_count=results['fake_face_count'],
        real_face_count=results['real_face_count'],
        fake_face_percentage=results['fake_face_percentage'],
        processing_time=results['processing_time'],
        heatmaps=json.loads(results['heatmaps']),
        created_at=job['created_at'],
        completed_at=job['completed_at']
    )


@app.get("/api/heatmap/{job_id}/{frame_id}")
async def get_heatmap(
    job_id: str,
    frame_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Download a specific heatmap image
    
    frame_id should be the filename (e.g., 'frame_0150_conf_97.png')
    """
    job = db.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Construct heatmap path
    heatmap_path = RESULTS_DIR / job_id / 'heatmaps' / frame_id
    
    if not heatmap_path.exists():
        raise HTTPException(status_code=404, detail="Heatmap not found")
    
    return FileResponse(
        heatmap_path,
        media_type="image/png",
        filename=frame_id
    )


@app.get("/api/jobs")
async def list_jobs(
    limit: int = 50,
    api_key: str = Depends(verify_api_key)
):
    """
    List all jobs (admin endpoint)
    
    Returns list of all jobs with their current status
    """
    jobs = db.list_jobs(limit=limit)
    return {"jobs": jobs, "count": len(jobs)}


@app.delete("/api/jobs/{job_id}")
async def delete_job(
    job_id: str,
    api_key: str = Depends(verify_api_key)
):
    """
    Delete a job and all associated files
    
    Removes video file, results, and heatmaps
    """
    job = db.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete files
    try:
        # Delete uploaded video
        video_path = Path(job['video_path'])
        if video_path.exists():
            video_path.unlink()
        
        # Delete results directory
        output_dir = RESULTS_DIR / job_id
        if output_dir.exists():
            shutil.rmtree(output_dir)
        
        # Delete from database
        db.delete_job(job_id)
        
        logger.info(f"[{job_id}] Job deleted successfully")
        
        return {"message": "Job deleted successfully", "job_id": job_id}
        
    except Exception as e:
        logger.error(f"[{job_id}] Failed to delete job: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete job")


if __name__ == "__main__":
    # Run with: python api_main.py
    uvicorn.run(
        "api_main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes (disable in production)
        log_level="info"
    )
