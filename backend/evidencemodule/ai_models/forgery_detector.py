# evidencemodule/ai_models/forgery_detector.py

import cv2
import numpy as np
import os
from PIL import Image
from evidencemodule.ai_models.edting_artifact_detector import error_level_analysis,check_noise_pattern
from evidencemodule.ai_models.edge_detector import analyze_edges
from uuid import uuid4
from django.conf import settings
from sklearn.decomposition import PCA
import time


def block_based_copy_move(image, block_size=16, threshold=5, max_matches=1000):
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        matches = []

        for y1 in range(0, h - block_size, block_size):
            for x1 in range(0, w - block_size, block_size):
                block1 = gray[y1:y1+block_size, x1:x1+block_size]
                for y2 in range(y1, h - block_size, block_size):
                    for x2 in range(x1 + 1, w - block_size, block_size):
                        block2 = gray[y2:y2+block_size, x2:x2+block_size]
                        dist = np.linalg.norm(block1 - block2)
                        if dist < threshold:
                            matches.append(((x1, y1), (x2, y2)))
                            if len(matches) > max_matches:
                                break

        forgery_map = np.zeros((h, w), dtype=np.uint8)
        for (x1, y1), (x2, y2) in matches:
            cv2.rectangle(forgery_map, (x1, y1), (x1+block_size, y1+block_size), 255, -1)
            cv2.rectangle(forgery_map, (x2, y2), (x2+block_size, y2+block_size), 255, -1)

        total_blocks = (h // block_size) * (w // block_size)
        copy_move_score = len(matches) / total_blocks

        return {
            "score": round(float(copy_move_score * 100), 2),
            "flagged": bool(copy_move_score > 0.2),
            "map": forgery_map
        }
    except Exception as e:
        return {"error": f"Copy-move analysis failed: {str(e)}"}

def dct_pca_copy_move(image, block_size=16, threshold=0.95, stride=8):
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        blocks = []
        positions = []

        # Slide a window across the image
        for y in range(0, h - block_size, stride):
            for x in range(0, w - block_size, stride):
                block = gray[y:y+block_size, x:x+block_size]
                dct_block = cv2.dct(np.float32(block))
                blocks.append(dct_block.flatten())
                positions.append((x, y))

        blocks = np.array(blocks)

        # Reduce dimensionality with PCA
        pca = PCA(n_components=16)
        reduced = pca.fit_transform(blocks)

        matched = []
        forgery_map = np.zeros((h, w), dtype=np.uint8)

        for i in range(len(reduced)):
            for j in range(i+1, len(reduced)):
                sim = np.dot(reduced[i], reduced[j]) / (np.linalg.norm(reduced[i]) * np.linalg.norm(reduced[j]) + 1e-8)
                if sim > threshold:
                    x1, y1 = positions[i]
                    x2, y2 = positions[j]
                    cv2.rectangle(forgery_map, (x1, y1), (x1+block_size, y1+block_size), 255, -1)
                    cv2.rectangle(forgery_map, (x2, y2), (x2+block_size, y2+block_size), 255, -1)
                    matched.append(((x1, y1), (x2, y2)))

        score = len(matched) / len(positions)
        return {
            "score": round(score * 100, 2),
            "flagged": score > 0.15,
            "map": forgery_map
        }

    except Exception as e:
        return {"error": f"DCT+PCA Copy-Move Detection failed: {str(e)}"}

def detect_forgery_classical_with_visual(image_path, output_dir="forgery_maps"):
    start_time = time.time()
    
    image = cv2.imread(image_path)
    if image is None:
        return {"error": "Invalid image or path"}

    # Resize for faster processing if image is too large
    MAX_DIM = 1024
    h, w = image.shape[:2]
    if max(h, w) > MAX_DIM:
        scale = MAX_DIM / float(max(h, w))
        image = cv2.resize(image, (int(w * scale), int(h * scale)))
    
    # Ensure output path exists
    if output_dir is None:
        output_dir = os.path.join(settings.MEDIA_ROOT, 'forgery_maps')
    os.makedirs(output_dir, exist_ok=True)

    filename = os.path.splitext(os.path.basename(image_path))[0]
    unique_id = uuid4().hex[:8]
    heatmap_filename = f"{filename}_{unique_id}_copymove.png"
    heatmap_path = os.path.join(output_dir, heatmap_filename)

    # ---- Copy-Move Detection ----
    try:
        copy_move = dct_pca_copy_move(image)

        if isinstance(copy_move, dict) and "map" in copy_move:
            raw_map = copy_move["map"]

            # Normalize the heatmap
            norm_map = cv2.normalize(raw_map, None, 0, 255, cv2.NORM_MINMAX).astype('uint8')
            heatmap = cv2.applyColorMap(norm_map, cv2.COLORMAP_JET)
            cv2.imwrite(heatmap_path, heatmap)

            copy_move["heatmap"] = f"forgery_maps/{heatmap_filename}"
            del copy_move["map"]
        else:
            copy_move["heatmap"] = None
    except Exception as e:
        copy_move = {"error": f"Copy-move error: {str(e)}"}

    # ---- Additional Analysis ----
    try:
        ela_result = error_level_analysis(image_path)
    except Exception as e:
        ela_result = {"ela_flagged": False, "ela_score": 0.0, "error": str(e)}

    try:
        noise = check_noise_pattern(image_path)
    except Exception as e:
        noise = {"noise_flagged": False, "laplacian_variance": 0.0, "error": str(e)}

    try:
        edge = analyze_edges(image_path)
    except Exception as e:
        edge = {"edge_flagged": False, "edge_density": 0.0, "blur_score": 0.0, "error": str(e)}

    # ---- Verdict ----
    try:
        verdict = "Forged" if any([
            copy_move.get("flagged", False),
            ela_result.get("ela_flagged", False),
            noise.get("noise_flagged", False),
            edge.get("edge_flagged", False)
        ]) else "Authentic"
    except Exception:
        verdict = "Undetermined"

    elapsed = time.time() - start_time
    print(f"[✓] Forgery analysis completed in {elapsed:.2f} seconds")

    return {
        "status": "success",
        "verdict": verdict,
        "methods_used": ["Copy-Move", "Noise Pattern", "Edge Check", "ELA"],
        "copy_move": copy_move,
        "ela": ela_result,
        "noise": noise,
        "edges": edge
    }
