"""
Grad-CAM Visual Explanations for Deepfake Detection
Generates heatmaps showing which face regions are suspicious

Author: Gbotemi
Date: November 2025
Phase: 7 - Visual Explanations
"""

import torch
import torch.nn.functional as F
import numpy as np
import cv2
from pathlib import Path
from typing import List, Tuple, Optional
import sys

# Add src to path
# sys.path.append(str(Path(__file__).parent))

from .src.models.architecture import DeepfakeDetector
from .src.data.dataset import get_transforms


class GradCAM:
    """
    Grad-CAM implementation for EfficientNet-B4
    
    Generates heatmaps showing which regions of the face the model
    focuses on when making predictions.
    """
    
    def __init__(self, model: DeepfakeDetector, device: str = 'cuda'):
        """
        Initialize Grad-CAM
        
        Args:
            model: Trained DeepfakeDetector model
            device: 'cuda' or 'cpu'
        """
        self.model = model
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        self.model.eval()
        
        # Storage for gradients and activations
        self.gradients = None
        self.activations = None
        
        # Register hooks on the target layer
        self._register_hooks()
        
    def _register_hooks(self):
        """
        Register forward and backward hooks on EfficientNet's last conv layer
        
        For EfficientNet-B4, we hook into the backbone blocks (last conv block)
        """
        # DeepfakeDetector architecture: model.backbone.blocks[-1] is the last conv block
        target_layer = self.model.backbone.blocks[-1]
        
        def forward_hook(module, input, output):
            """Store activations during forward pass"""
            self.activations = output.detach()
        
        def backward_hook(module, grad_input, grad_output):
            """Store gradients during backward pass"""
            self.gradients = grad_output[0].detach()
        
        # Register hooks
        target_layer.register_forward_hook(forward_hook)
        target_layer.register_full_backward_hook(backward_hook)
    
    def generate_heatmap(
        self,
        face_image: np.ndarray,
        transform=None,
        target_class: int = 1
    ) -> Tuple[np.ndarray, float, int]:
        """
        Generate Grad-CAM heatmap for a face image
        
        Args:
            face_image: Face image (H, W, 3) RGB numpy array
            transform: Image transforms (uses validation transforms if None)
            target_class: Class to generate heatmap for (1=FAKE, 0=REAL)
                         If None, uses predicted class
        
        Returns:
            Tuple of (heatmap, confidence, predicted_class)
            - heatmap: Heatmap as numpy array (H, W) in range [0, 255]
            - confidence: Model confidence for the prediction
            - predicted_class: Predicted class (0=REAL, 1=FAKE)
        """
        # Get transforms if not provided
        if transform is None:
            transform = get_transforms('val')
        
        # Prepare input tensor
        input_tensor = transform(image=face_image)['image'].unsqueeze(0).to(self.device)
        input_tensor.requires_grad = True
        
        # Forward pass
        self.model.zero_grad()
        output = self.model(input_tensor)
        
        # Get prediction
        probs = F.softmax(output, dim=1)
        predicted_class = probs.argmax(dim=1).item()
        confidence = probs[0, predicted_class].item()
        
        # Use target class or predicted class
        if target_class is None:
            target_class = predicted_class
        
        # Backward pass for target class
        class_score = output[0, target_class]
        class_score.backward()
        
        # Generate heatmap from gradients and activations
        gradients = self.gradients[0].cpu().numpy()  # (C, H, W)
        activations = self.activations[0].cpu().numpy()  # (C, H, W)
        
        # Global average pooling on gradients to get weights
        weights = np.mean(gradients, axis=(1, 2))  # (C,)
        
        # Weighted combination of activation maps
        heatmap = np.zeros(activations.shape[1:], dtype=np.float32)  # (H, W)
        for i, w in enumerate(weights):
            heatmap += w * activations[i]
        
        # Apply ReLU (only positive contributions)
        heatmap = np.maximum(heatmap, 0)
        
        # Normalize to [0, 1]
        if heatmap.max() > 0:
            heatmap = heatmap / heatmap.max()
        
        # Resize to original image size
        heatmap = cv2.resize(heatmap, (face_image.shape[1], face_image.shape[0]))
        
        # Convert to uint8 [0, 255]
        heatmap_uint8 = (heatmap * 255).astype(np.uint8)
        
        return heatmap_uint8, confidence, predicted_class
    
    def overlay_heatmap(
        self,
        face_image: np.ndarray,
        heatmap: np.ndarray,
        colormap: int = cv2.COLORMAP_JET,
        alpha: float = 0.5
    ) -> np.ndarray:
        """
        Overlay heatmap on original face image
        
        Args:
            face_image: Original face image (H, W, 3) RGB
            heatmap: Heatmap (H, W) in range [0, 255]
            colormap: OpenCV colormap (COLORMAP_JET, COLORMAP_HOT, etc.)
            alpha: Transparency of heatmap (0=transparent, 1=opaque)
        
        Returns:
            Overlaid image (H, W, 3) RGB
        """
        # Apply colormap to heatmap
        heatmap_colored = cv2.applyColorMap(heatmap, colormap)
        
        # Convert from BGR (OpenCV) to RGB
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        # Ensure face_image is uint8
        if face_image.dtype != np.uint8:
            if face_image.max() <= 1.0:
                face_image = (face_image * 255).astype(np.uint8)
            else:
                face_image = face_image.astype(np.uint8)
        
        # Blend images
        overlaid = cv2.addWeighted(face_image, 1 - alpha, heatmap_colored, alpha, 0)
        
        return overlaid
    
    def save_visualization(
        self,
        face_image: np.ndarray,
        heatmap: np.ndarray,
        output_path: str,
        prediction: str,
        confidence: float,
        show_text: bool = True
    ):
        """
        Save a visualization with original, heatmap, and overlay
        
        Args:
            face_image: Original face image
            heatmap: Heatmap array
            output_path: Path to save image
            prediction: 'REAL' or 'FAKE'
            confidence: Model confidence
            show_text: Add text labels to image
        """
        # Create overlay
        overlaid = self.overlay_heatmap(face_image, heatmap, alpha=0.5)
        
        # Apply colormap to heatmap for standalone view
        heatmap_colored = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)
        
        # Create side-by-side visualization
        # [Original | Heatmap | Overlay]
        h, w = face_image.shape[:2]
        canvas = np.zeros((h, w * 3, 3), dtype=np.uint8)
        
        canvas[:, 0:w] = face_image
        canvas[:, w:2*w] = heatmap_colored
        canvas[:, 2*w:3*w] = overlaid
        
        # Add text labels if requested
        if show_text:
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.6
            thickness = 2
            color = (255, 255, 255)
            
            # Labels
            cv2.putText(canvas, "Original", (10, 30), font, font_scale, color, thickness)
            cv2.putText(canvas, "Heatmap", (w + 10, 30), font, font_scale, color, thickness)
            cv2.putText(canvas, "Overlay", (2*w + 10, 30), font, font_scale, color, thickness)
            
            # Prediction and confidence
            pred_color = (255, 0, 0) if prediction == 'FAKE' else (0, 255, 0)
            pred_text = f"{prediction}: {confidence*100:.1f}%"
            cv2.putText(canvas, pred_text, (10, h - 10), font, font_scale, pred_color, thickness)
        
        # Save
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert RGB to BGR for OpenCV saving
        canvas_bgr = cv2.cvtColor(canvas, cv2.COLOR_RGB2BGR)
        cv2.imwrite(str(output_path), canvas_bgr)


class VideoGradCAM:
    """
    Generate Grad-CAM visualizations for suspicious frames in videos
    
    Integrates with Phase 6 video prediction pipeline
    """
    
    def __init__(
        self,
        model_path: str = 'models/checkpoints/best_model.pth',
        device: str = 'cuda'
    ):
        """
        Initialize Video Grad-CAM generator
        
        Args:
            model_path: Path to trained model checkpoint
            device: 'cuda' or 'cpu'
        """
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        
        # Load model
        self.model = DeepfakeDetector().to(self.device)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.eval()
        
        # Initialize Grad-CAM
        self.gradcam = GradCAM(self.model, device=str(self.device))
        
        # Get transforms
        self.transform = get_transforms('val')
    
    def generate_for_suspicious_frames(
        self,
        video_result,
        faces_list: List[dict],
        output_dir: str,
        confidence_threshold: float = 0.7,
        max_frames: int = 10
    ) -> List[str]:
        """
        Generate Grad-CAM visualizations for suspicious frames
        
        Args:
            video_result: VideoPrediction result from Phase 6
            faces_list: List of face dicts with 'face' and 'frame_number'
            output_dir: Directory to save heatmaps
            confidence_threshold: Only generate for frames above this confidence
            max_frames: Maximum number of heatmaps to generate
        
        Returns:
            List of paths to saved heatmap images
        """
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Get suspicious frames (predicted as FAKE with high confidence)
        suspicious_frames = [
            fp for fp in video_result.frame_predictions
            if fp.prediction == 'FAKE' and fp.confidence >= confidence_threshold
        ]
        
        # Sort by confidence (most suspicious first)
        suspicious_frames = sorted(suspicious_frames, key=lambda x: x.confidence, reverse=True)
        
        # Limit number of frames
        suspicious_frames = suspicious_frames[:max_frames]
        
        print(f"\nGenerating Grad-CAM for {len(suspicious_frames)} suspicious frames...")
        
        saved_paths = []
        
        for i, frame_pred in enumerate(suspicious_frames, 1):
            # Find corresponding face image
            face_data = next(
                (f for f in faces_list if f['frame_number'] == frame_pred.frame_number),
                None
            )
            
            if face_data is None:
                print(f"  ⚠ Frame {frame_pred.frame_number}: Face data not found")
                continue
            
            face_image = face_data['face']
            
            # Generate heatmap
            heatmap, confidence, pred_class = self.gradcam.generate_heatmap(
                face_image,
                transform=self.transform,
                target_class=1  # Generate for FAKE class
            )
            
            # Save visualization
            output_path = output_dir / f"frame_{frame_pred.frame_number:04d}_conf_{confidence*100:.0f}.png"
            
            self.gradcam.save_visualization(
                face_image,
                heatmap,
                str(output_path),
                prediction='FAKE',
                confidence=confidence,
                show_text=True
            )
            
            saved_paths.append(str(output_path))
            
            print(f"  [{i}/{len(suspicious_frames)}] Frame {frame_pred.frame_number} "
                  f"(conf: {confidence*100:.1f}%) → {output_path.name}")
        
        print(f"\n✓ Generated {len(saved_paths)} heatmaps in: {output_dir}")
        
        return saved_paths


def demo_gradcam(
    face_image_path: str,
    model_path: str = 'models/checkpoints/best_model.pth',
    output_path: str = 'gradcam_demo.png'
):
    """
    Demo function to test Grad-CAM on a single face image
    
    Args:
        face_image_path: Path to face image
        model_path: Path to model checkpoint
        output_path: Where to save result
    """
    # Load image
    face_image = cv2.imread(face_image_path)
    face_image = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
    
    # Initialize
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = DeepfakeDetector().to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()
    
    gradcam = GradCAM(model, device=device)
    transform = get_transforms('val')
    
    # Generate heatmap
    print("Generating Grad-CAM heatmap...")
    heatmap, confidence, pred_class = gradcam.generate_heatmap(face_image, transform)
    
    prediction = 'FAKE' if pred_class == 1 else 'REAL'
    print(f"Prediction: {prediction} (confidence: {confidence*100:.1f}%)")
    
    # Save visualization
    gradcam.save_visualization(
        face_image,
        heatmap,
        output_path,
        prediction=prediction,
        confidence=confidence
    )
    
    print(f"✓ Saved visualization to: {output_path}")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Grad-CAM visualization for deepfake detection')
    parser.add_argument('image', help='Path to face image')
    parser.add_argument('--model', default='models/checkpoints/best_model.pth',
                       help='Path to model checkpoint')
    parser.add_argument('--output', default='gradcam_demo.png',
                       help='Output path for visualization')
    
    args = parser.parse_args()
    
    demo_gradcam(args.image, args.model, args.output)