"""
Integrated Video Analysis with Grad-CAM
Combines Phase 6 (video prediction) with Phase 7 (visual explanations)

Author: Gbotemi
Date: November 2025
"""

import sys
from pathlib import Path
import argparse

sys.path.append(str(Path(__file__).parent))

from predict_video import VideoDeepfakeDetector
from gradcam import VideoGradCAM


def analyze_video_with_gradcam(
    video_path: str,
    output_dir: str = 'analysis_results',
    generate_heatmaps: bool = True,
    confidence_threshold: float = 0.7,
    max_heatmaps: int = 5,
    verbose: bool = True
):
    """
    Complete video analysis with Grad-CAM visualizations
    
    Args:
        video_path: Path to video file
        output_dir: Directory for results
        generate_heatmaps: Whether to generate Grad-CAM heatmaps
        confidence_threshold: Min confidence for heatmap generation
        max_heatmaps: Maximum number of heatmaps to generate
        verbose: Print detailed progress
    
    Returns:
        Dict with video_result and heatmap_paths
    """
    video_path = Path(video_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\n{'='*70}")
    print(f"DEEPFAKE VIDEO ANALYSIS WITH VISUAL EXPLANATIONS")
    print(f"{'='*70}")
    print(f"Video: {video_path.name}")
    print(f"Output: {output_dir}")
    print(f"{'='*70}\n")
    
    # Phase 6: Video-level prediction
    print("PHASE 1: Video-Level Prediction")
    print("-" * 70)
    
    detector = VideoDeepfakeDetector()
    
    # We need to save faces for Grad-CAM later
    # Run prediction and capture faces_list
    import torch
    import numpy as np
    from src.data.face_extraction import FaceExtractor
    
    # Extract video info
    video_info = detector.extract_video_info(video_path)
    
    # Extract faces
    if verbose:
        print(f"\nExtracting faces...")
    
    faces_data = detector.face_extractor.extract_from_video(
        str(video_path),
        sample_rate=detector.sample_rate,
        max_faces=detector.max_faces
    )
    
    # Handle different return formats
    if len(faces_data) > 0:
        if isinstance(faces_data[0], dict):
            faces_list = faces_data
        else:
            faces_list = []
            for idx, face_tensor in enumerate(faces_data):
                if torch.is_tensor(face_tensor):
                    face_np = face_tensor.cpu().numpy()
                    if face_np.ndim == 4:
                        face_np = face_np[0]
                    if face_np.shape[0] == 3:
                        face_np = np.transpose(face_np, (1, 2, 0))
                    if face_np.max() <= 1.0:
                        face_np = (face_np * 255).astype(np.uint8)
                else:
                    face_np = face_tensor
                
                faces_list.append({
                    'face': face_np,
                    'frame_number': idx * detector.sample_rate
                })
    else:
        faces_list = []
    
    if verbose:
        print(f"✓ Extracted {len(faces_list)} faces")
    
    # Run predictions
    if verbose:
        print(f"Analyzing faces...")
    
    faces = [f['face'] for f in faces_list]
    predictions = detector.predict_faces(faces)
    
    # Build frame predictions
    from predict_video import FramePrediction
    frame_predictions = []
    for face_data, (pred, conf) in zip(faces_list, predictions):
        frame_pred = FramePrediction(
            frame_number=face_data['frame_number'],
            timestamp=face_data['frame_number'] / video_info['fps'],
            prediction='FAKE' if pred == 1 else 'REAL',
            confidence=conf,
            num_faces=1
        )
        frame_predictions.append(frame_pred)
    
    # Aggregate predictions
    video_pred, video_conf = detector.aggregate_predictions(frame_predictions)
    
    # Calculate statistics
    fake_count = sum(1 for fp in frame_predictions if fp.prediction == 'FAKE')
    real_count = sum(1 for fp in frame_predictions if fp.prediction == 'REAL')
    fake_percentage = (fake_count / len(frame_predictions)) * 100 if frame_predictions else 0
    
    # Build result
    from predict_video import VideoPrediction
    from datetime import datetime
    
    video_result = VideoPrediction(
        video_path=str(video_path),
        video_duration=video_info['duration'],
        total_frames=video_info['frame_count'],
        processed_frames=len(set(f.frame_number for f in frame_predictions)),
        prediction=video_pred,
        confidence=video_conf,
        fake_face_count=fake_count,
        real_face_count=real_count,
        fake_face_percentage=fake_percentage,
        frame_predictions=frame_predictions,
        processing_time=0.0,
        timestamp=datetime.now().isoformat()
    )
    
    # Print summary
    if verbose:
        print(f"\n{'='*70}")
        print(f"VIDEO ANALYSIS RESULTS")
        print(f"{'='*70}")
        
        verdict_symbol = "🔴" if video_pred == 'FAKE' else "🟢"
        print(f"\n{verdict_symbol} VERDICT: {video_pred}")
        print(f"Confidence: {video_conf*100:.1f}%")
        print(f"\nStatistics:")
        print(f"  • Faces analyzed: {len(frame_predictions)}")
        print(f"  • Predicted as FAKE: {fake_count} ({fake_percentage:.1f}%)")
        print(f"  • Predicted as REAL: {real_count}")
    
    # Save JSON result
    json_path = output_dir / f"{video_path.stem}_result.json"
    import json
    with open(json_path, 'w') as f:
        json.dump(video_result.to_dict(), f, indent=2)
    
    if verbose:
        print(f"\n✓ Results saved to: {json_path}")
    
    # Phase 7: Grad-CAM visualizations
    heatmap_paths = []
    
    if generate_heatmaps and video_pred == 'FAKE':
        print(f"\n{'='*70}")
        print("PHASE 2: Generating Visual Explanations (Grad-CAM)")
        print("-" * 70)
        
        gradcam_gen = VideoGradCAM()
        
        heatmap_dir = output_dir / 'heatmaps'
        heatmap_paths = gradcam_gen.generate_for_suspicious_frames(
            video_result,
            faces_list,
            str(heatmap_dir),
            confidence_threshold=confidence_threshold,
            max_frames=max_heatmaps
        )
    
    elif video_pred == 'REAL' and verbose:
        print(f"\n✓ Video predicted as REAL - skipping Grad-CAM generation")
    
    # Final summary
    if verbose:
        print(f"\n{'='*70}")
        print("ANALYSIS COMPLETE")
        print(f"{'='*70}")
        print(f"\nResults:")
        print(f"  • Video prediction: {json_path}")
        if heatmap_paths:
            print(f"  • Heatmaps: {output_dir / 'heatmaps'} ({len(heatmap_paths)} images)")
        print()
    
    return {
        'video_result': video_result,
        'heatmap_paths': heatmap_paths,
        'json_path': str(json_path)
    }


def main():
    parser = argparse.ArgumentParser(
        description='Analyze video for deepfakes with visual explanations',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic analysis with heatmaps
  python analyze_video.py video.mp4
  
  # Custom output directory
  python analyze_video.py video.mp4 --output my_results
  
  # Skip heatmap generation (faster)
  python analyze_video.py video.mp4 --no-heatmaps
  
  # Generate more heatmaps
  python analyze_video.py video.mp4 --max-heatmaps 10
  
  # Lower confidence threshold
  python analyze_video.py video.mp4 --threshold 0.5
        """
    )
    
    parser.add_argument('video', help='Path to video file')
    parser.add_argument('--output', '-o', default='analysis_results',
                       help='Output directory for results (default: analysis_results)')
    parser.add_argument('--no-heatmaps', action='store_true',
                       help='Skip Grad-CAM heatmap generation')
    parser.add_argument('--threshold', '-t', type=float, default=0.7,
                       help='Confidence threshold for heatmap generation (default: 0.7)')
    parser.add_argument('--max-heatmaps', '-m', type=int, default=5,
                       help='Maximum number of heatmaps to generate (default: 5)')
    parser.add_argument('--quiet', '-q', action='store_true',
                       help='Suppress detailed output')
    
    args = parser.parse_args()
    
    # Check if video exists
    if not Path(args.video).exists():
        print(f"Error: Video file not found: {args.video}")
        return 1
    
    # Run analysis
    try:
        result = analyze_video_with_gradcam(
            args.video,
            output_dir=args.output,
            generate_heatmaps=not args.no_heatmaps,
            confidence_threshold=args.threshold,
            max_heatmaps=args.max_heatmaps,
            verbose=not args.quiet
        )
        
        # Return exit code based on verdict
        if result['video_result'].prediction == 'FAKE':
            return 1
        elif result['video_result'].prediction == 'REAL':
            return 0
        else:
            return 2
            
    except Exception as e:
        print(f"\nError during analysis: {e}")
        import traceback
        traceback.print_exc()
        return 2


if __name__ == '__main__':
    exit(main())
