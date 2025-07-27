# evidencemodule/ai_models/edge_detector.py

import cv2
import numpy as np
import os

def analyze_edges(image_path, save_edge_map=False, edge_map_path=None):
    try:
        image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            return {"error": "Invalid image or path."}
        if not isinstance(image_path, str) or not os.path.isfile(image_path):
            return {"error": f"Invalid image path: {image_path}"}
        if not isinstance(image_path, str) or not os.path.isfile(image_path):
            return {"error": f"Invalid image path: {image_path}"}


        # Run Canny edge detection
        edges = cv2.Canny(image, 100, 200)

        # Calculate edge density as a percentage
        edge_density = float(np.sum(edges > 0)) / edges.size * 100

        # Optionally save edge map
        saved_map_path = None
        if save_edge_map:
            edge_output_path = edge_map_path or os.path.splitext(image_path)[0] + "_edges.jpg"
            cv2.imwrite(edge_output_path, edges)
            saved_map_path = edge_output_path

        # Use Laplacian variance for blur detection
        blur_score = float(cv2.Laplacian(image, cv2.CV_64F).var())

        # Decision logic
        edge_flagged = bool(edge_density < 2.0 or edge_density > 25.0)
        blur_flagged = bool(blur_score < 50)

        return {
            "edge_density": round(edge_density, 2),
            "blur_score": round(blur_score, 2),
            "edge_flagged": edge_flagged,
            "blur_flagged": blur_flagged,
            "edge_map_saved": save_edge_map,
            "saved_map_path": saved_map_path
        }

    except Exception as e:
        return {
            "error": f"Edge analysis failed: {str(e)}"
        }
