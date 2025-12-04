"""
Video-Level Deepfake Detection
Processes entire videos and returns aggregated predictions with frame-by-frame breakdown.

Author: Gbotemi
Date: November 2025
"""

import torch
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import json
from datetime import datetime
import sys
import os
from dataclasses import dataclass, asdict

# Add src to path for imports
# Add src to path for imports
# sys.path.append(str(Path(__file__).parent))

from .src.models.architecture import DeepfakeDetector
from .src.data.face_extraction import FaceExtractor
from .src.data.dataset import get_transforms


@dataclass
class FramePrediction:
    """Single frame prediction result"""
    frame_number: int
    timestamp: float  # seconds
    prediction: str  # 'REAL' or 'FAKE'
    confidence: float
    num_faces: int


@dataclass
class VideoPrediction:
    """Complete video analysis result"""
    video_path: str
    video_duration: float
    total_frames: int
    processed_frames: int
    
    # Final verdict
    prediction: str  # 'REAL' or 'FAKE'
    confidence: float
    
    # Statistics
    fake_face_count: int
    real_face_count: int
    fake_face_percentage: float
    
    # Frame-by-frame breakdown
    frame_predictions: List[FramePrediction]
    
    # Metadata
    processing_time: float
    timestamp: str
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        result = asdict(self)
        result['frame_predictions'] = [asdict(fp) for fp in self.frame_predictions]
        return result


class VideoDeepfakeDetector:
    """
    Video-level deepfake detection pipeline.
    
    Processes videos by:
    1. Extracting faces from sampled frames
    2. Running model on each face
    3. Aggregating predictions to video level
    """
    
    def __init__(
        self,
        model_path: str = None,
        device: str = 'cuda',
        sample_rate: int = 30,
        max_faces: int = 50,
        batch_size: int = 8
    ):
        """
        Initialize the video detector.
        
        Args:
            model_path: Path to trained model checkpoint
            device: 'cuda' or 'cpu'
            sample_rate: Process every Nth frame (30 = 1 frame per second at 30fps)
            max_faces: Maximum faces to process (limits processing time)
            batch_size: Batch size for model inference
        """
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        self.sample_rate = sample_rate
        self.max_faces = max_faces
        self.batch_size = batch_size
        
        if model_path is None:
             model_path = os.path.join(os.path.dirname(__file__), 'checkpoints', 'best_model.pth')

        print(f"Initializing detector on {self.device}...")
        
        # Load model
        self.model = DeepfakeDetector().to(self.device)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.eval()
        print("✓ Model loaded")
        
        # Initialize face extractor
        self.face_extractor = FaceExtractor(device=str(self.device))
        print("✓ Face extractor initialized")
        
        # Get transforms for preprocessing
        self.transform = get_transforms('val')
        print("✓ Transforms loaded")
        
    def extract_video_info(self, video_path: str) -> Dict:
        """Extract basic video information"""
        cap = cv2.VideoCapture(video_path)
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frame_count / fps if fps > 0 else 0
        
        cap.release()
        
        return {
            'fps': fps,
            'frame_count': frame_count,
            'duration': duration
        }
    
    def predict_faces(self, faces: List[np.ndarray]) -> List[Tuple[int, float]]:
        """
        Run model prediction on a list of face images.
        
        Args:
            faces: List of face images (numpy arrays, RGB, any size)
            
        Returns:
            List of (prediction, confidence) tuples
            prediction: 0=REAL, 1=FAKE
            confidence: probability of predicted class
        """
        if len(faces) == 0:
            return []
        
        predictions = []
        
        # Process in batches
        for i in range(0, len(faces), self.batch_size):
            batch_faces = faces[i:i + self.batch_size]
            
            # Transform and stack faces
            batch_tensors = []
            for face in batch_faces:
                # Ensure face is uint8 numpy array
                if face.dtype != np.uint8:
                    face = (face * 255).astype(np.uint8)
                
                # Apply transforms (albumentations expects uint8 input)
                # The transform pipeline handles: Resize -> Normalize -> ToTensorV2
                transformed = self.transform(image=face)['image']
                
                # Ensure it's a float tensor (ToTensorV2 should handle this, but be explicit)
                if not isinstance(transformed, torch.Tensor):
                    transformed = torch.from_numpy(transformed).float()
                if transformed.dtype != torch.float32:
                    transformed = transformed.float()
                    
                batch_tensors.append(transformed)
            
            batch_tensor = torch.stack(batch_tensors).to(self.device)
            
            # Run inference
            with torch.no_grad():
                outputs = self.model(batch_tensor)
                probs = torch.softmax(outputs, dim=1)
                
                # Get predictions and confidences
                for prob in probs:
                    pred = prob.argmax().item()
                    conf = prob[pred].item()
                    predictions.append((pred, conf))
        
        return predictions
    
    def aggregate_predictions(
        self,
        frame_predictions: List[FramePrediction],
        fake_threshold: float = 0.30,
        confidence_threshold: float = 0.80
    ) -> Tuple[str, float]:
        """
        Aggregate frame-level predictions to video-level verdict.
        
        Strategy: Hybrid approach
        - Count faces predicted as FAKE with high confidence
        - If >30% of faces are FAKE with >70% confidence → Video is FAKE
        - Otherwise → Video is REAL
        
        This approach biases toward detecting deepfakes (better for forensics)
        while requiring strong evidence.
        
        Args:
            frame_predictions: List of frame predictions
            fake_threshold: Percentage of fake faces needed to classify video as fake
            confidence_threshold: Minimum confidence for a prediction to count
            
        Returns:
            (prediction, confidence) tuple
        """
        if not frame_predictions:
            return 'UNKNOWN', 0.0
        
        # Count high-confidence fake predictions
        total_faces = len(frame_predictions)
        high_conf_fakes = sum(
            1 for fp in frame_predictions
            if fp.prediction == 'FAKE' and fp.confidence >= confidence_threshold
        )
        
        fake_percentage = high_conf_fakes / total_faces
        
        # Make decision
        if fake_percentage >= fake_threshold:
            prediction = 'FAKE'
            # Confidence is based on how far above threshold we are
            # and the average confidence of fake predictions
            fake_confidences = [
                fp.confidence for fp in frame_predictions
                if fp.prediction == 'FAKE' and fp.confidence >= confidence_threshold
            ]
            avg_fake_conf = np.mean(fake_confidences) if fake_confidences else 0.0
            
            # Combine percentage above threshold with average confidence
            confidence = min(0.99, (fake_percentage / fake_threshold) * 0.5 + avg_fake_conf * 0.5)
        else:
            prediction = 'REAL'
            # Confidence for REAL is based on how many faces are confidently real
            real_confidences = [
                fp.confidence for fp in frame_predictions
                if fp.prediction == 'REAL' and fp.confidence >= confidence_threshold
            ]
            avg_real_conf = np.mean(real_confidences) if real_confidences else 0.0
            confidence = avg_real_conf
        
        return prediction, confidence
    
    def predict_video(
        self,
        video_path: str,
        output_json: Optional[str] = None,
        verbose: bool = True
    ) -> VideoPrediction:
        """
        Analyze a video and return deepfake detection results.
        
        Args:
            video_path: Path to video file
            output_json: Optional path to save results as JSON
            verbose: Print progress messages
            
        Returns:
            VideoPrediction object with complete analysis
        """
        start_time = datetime.now()
        video_path = str(Path(video_path).resolve())
        
        if verbose:
            print(f"\n{'='*60}")
            print(f"Analyzing video: {Path(video_path).name}")
            print(f"{'='*60}\n")
        
        # Extract video info
        video_info = self.extract_video_info(video_path)
        if verbose:
            print(f"Video duration: {video_info['duration']:.2f} seconds")
            print(f"Total frames: {video_info['frame_count']}")
            print(f"FPS: {video_info['fps']:.2f}")
            print(f"Will sample every {self.sample_rate} frames\n")
        
        # Extract faces from video
        if verbose:
            print("Extracting faces from video...")
        
        faces_data = self.face_extractor.extract_from_video(
            video_path,
            sample_rate=self.sample_rate,
            max_faces=self.max_faces
        )
        
        # Handle different return formats from face extractor
        # It might return tensors directly or list of dicts
        if len(faces_data) > 0:
            if isinstance(faces_data[0], dict):
                # Already in correct format
                faces_list = faces_data
            else:
                # Convert tensors to expected format
                # Assume sequential frame numbers if not provided
                faces_list = []
                for idx, face_tensor in enumerate(faces_data):
                    # Convert tensor to numpy if needed
                    if torch.is_tensor(face_tensor):
                        face_np = face_tensor.cpu().numpy()
                        # Handle different tensor formats
                        if face_np.ndim == 4:  # Batch dimension
                            face_np = face_np[0]
                        # Convert from CHW to HWC if needed
                        if face_np.shape[0] == 3:  # CHW format
                            face_np = np.transpose(face_np, (1, 2, 0))
                        # Denormalize if needed (0-1 range to 0-255)
                        if face_np.max() <= 1.0:
                            face_np = (face_np * 255).astype(np.uint8)
                    else:
                        face_np = face_tensor
                    
                    faces_list.append({
                        'face': face_np,
                        'frame_number': idx * self.sample_rate
                    })
        else:
            faces_list = []
        
        if verbose:
            if len(faces_list) > 0:
                unique_frames = len(set(f['frame_number'] for f in faces_list))
                print(f"✓ Extracted {len(faces_list)} faces from {unique_frames} frames\n")
            else:
                print(f"✓ Extracted 0 faces\n")
        
        if len(faces_list) == 0:
            if verbose:
                print("⚠ No faces detected in video!")
            
            # Return result with no faces
            return VideoPrediction(
                video_path=video_path,
                video_duration=video_info['duration'],
                total_frames=video_info['frame_count'],
                processed_frames=0,
                prediction='UNKNOWN',
                confidence=0.0,
                fake_face_count=0,
                real_face_count=0,
                fake_face_percentage=0.0,
                frame_predictions=[],
                processing_time=(datetime.now() - start_time).total_seconds(),
                timestamp=datetime.now().isoformat()
            )
        
        # Run predictions
        if verbose:
            print("Running deepfake detection on faces...")
        
        faces = [f['face'] for f in faces_list]
        predictions = self.predict_faces(faces)
        
        # Build frame predictions
        frame_predictions = []
        for face_data, (pred, conf) in zip(faces_list, predictions):
            frame_pred = FramePrediction(
                frame_number=face_data['frame_number'],
                timestamp=face_data['frame_number'] / video_info['fps'],
                prediction='FAKE' if pred == 1 else 'REAL',
                confidence=conf,
                num_faces=1  # One face per detection
            )
            frame_predictions.append(frame_pred)
        
        if verbose:
            print(f"✓ Processed {len(frame_predictions)} faces\n")
        
        # Aggregate to video-level prediction
        video_pred, video_conf = self.aggregate_predictions(frame_predictions)
        
        # Calculate statistics
        fake_count = sum(1 for fp in frame_predictions if fp.prediction == 'FAKE')
        real_count = sum(1 for fp in frame_predictions if fp.prediction == 'REAL')
        fake_percentage = (fake_count / len(frame_predictions)) * 100 if frame_predictions else 0
        
        # Build result
        result = VideoPrediction(
            video_path=video_path,
            video_duration=video_info['duration'],
            total_frames=video_info['frame_count'],
            processed_frames=len(set(f.frame_number for f in frame_predictions)),
            prediction=video_pred,
            confidence=video_conf,
            fake_face_count=fake_count,
            real_face_count=real_count,
            fake_face_percentage=fake_percentage,
            frame_predictions=frame_predictions,
            processing_time=(datetime.now() - start_time).total_seconds(),
            timestamp=datetime.now().isoformat()
        )
        
        # Print summary
        if verbose:
            self._print_summary(result)
        
        # Save to JSON if requested
        if output_json:
            output_path = Path(output_json)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w') as f:
                json.dump(result.to_dict(), f, indent=2)
            if verbose:
                print(f"\n✓ Results saved to: {output_json}")
        
        return result
    
    def _print_summary(self, result: VideoPrediction):
        """Print a formatted summary of results"""
        print(f"{'='*60}")
        print(f"ANALYSIS COMPLETE")
        print(f"{'='*60}\n")
        
        # Verdict with color coding (for terminals that support it)
        verdict_color = '\033[91m' if result.prediction == 'FAKE' else '\033[92m'
        reset_color = '\033[0m'
        
        print(f"VERDICT: {verdict_color}{result.prediction}{reset_color}")
        print(f"Confidence: {result.confidence*100:.2f}%\n")
        
        print(f"Statistics:")
        print(f"  • Processed frames: {result.processed_frames}/{result.total_frames}")
        print(f"  • Total faces analyzed: {result.fake_face_count + result.real_face_count}")
        print(f"  • Faces predicted as FAKE: {result.fake_face_count} ({result.fake_face_percentage:.1f}%)")
        print(f"  • Faces predicted as REAL: {result.real_face_count}")
        print(f"  • Processing time: {result.processing_time:.2f} seconds\n")
        
        # Show most suspicious frames
        if result.prediction == 'FAKE':
            suspicious_frames = sorted(
                [fp for fp in result.frame_predictions if fp.prediction == 'FAKE'],
                key=lambda x: x.confidence,
                reverse=True
            )[:5]
            
            if suspicious_frames:
                print(f"Most suspicious frames (top 5):")
                for i, fp in enumerate(suspicious_frames, 1):
                    print(f"  {i}. Frame {fp.frame_number} at {fp.timestamp:.2f}s - "
                          f"Confidence: {fp.confidence*100:.1f}%")
                print()

