import subprocess
import json
import hashlib
import cv2
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
from PIL import Image
import io
import os
import re

class Printable_and_Metadata:
    def __init__(self, video_path):
        self.path = video_path
        self.name = os.path.basename(video_path)
        
    def extract_raw_printable_strings(self, min_length: int = 6) -> list[dict]:
        """
        Returns a list of dictionaries — perfect for hex-editor frontend:
        [
            {
                "offset": 123456,      # byte offset in file (hex in JSON: 0x1e240)
                "hex_offset": "0x1e240",
                "length": 47,
                "string": "%PDF-1.7\n%..."
            },
            ...
        ]
        """
        strings = []
        current = ""
        offset_start = 0
        file_offset = 0

        try:
            with open(self.path, "rb") as f:
                while chunk := f.read(16384):  
                    for byte in chunk:
                        char = chr(byte)

                        if 32 <= byte <= 126 or byte in (9, 10, 13): 
                            if not current:
                                offset_start = file_offset
                            current += char
                        else:
                            if len(current) >= min_length:
                                strings.append({
                                    "offset": offset_start,
                                    "hex_offset": f"0x{offset_start:X}",
                                    "length": len(current),
                                    "string": current
                                })
                            current = ""

                        file_offset += 1

                # last string at EOF
                if len(current) >= min_length:
                    strings.append({
                        "offset": offset_start,
                        "hex_offset": f"0x{offset_start:X}",
                        "length": len(current),
                        "string": current
                    })

        except Exception as e:
            return [{"error": f"Failed to read file: {e}"}]

        # Sort by offset (natural file order) and limit to top 2000
        strings.sort(key=lambda x: x["offset"])
        return strings[:2000]
    def extract_text_and_metadata(self):
        """
        Returns a rich dictionary with:
        - All printable strings found via OCR
        - Complete ffprobe metadata (container + streams + tags)
        - Embedded subtitles (if present)
        - File hashes (MD5 & SHA256)
        """
        result = {
            "extracted_text": {
                "all_strings": [],
                "unique_strings": [],
                "frame_count_scanned": 0,
                "ocr_confidence_avg": 0.0
            },
            "metadata": {},
            "embedded_subtitles": [],
            "hashes": {}
        }

        # ————————————————————————
        # 1. OCR: Extract printable text from video frames
        # ————————————————————————
        cap = cv2.VideoCapture(self.path)
        if not cap.isOpened():
            result["extracted_text"]["error"] = "Could not open video for OCR"
        else:
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            step = max(1, total_frames // 200)  # Scan up to ~200 frames max
            confidences = []

            frame_idx = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                if frame_idx % step == 0:
                    # Convert to PIL → pytesseract
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    pil_img = Image.fromarray(rgb_frame)

                    # Use PSD mode for better accuracy + speed
                    data = pytesseract.image_to_data(pil_img, output_type=pytesseract.Output.DICT, lang='eng')
                    for i, conf in enumerate(data["conf"]):
                        if int(conf) > 30:  # Confidence threshold
                            text = data["text"][i].strip()
                            if text and re.match(r'^[A-Za-z0-9\s\.,!@#$%^&*()_+=\-\[\]{}\\\|;:\'"/<>?`~]+$', text):
                                result["extracted_text"]["all_strings"].append({
                                    "text": text,
                                    "confidence": int(conf),
                                    "frame": frame_idx
                                })
                                confidences.append(int(conf))

                frame_idx += 1
                if frame_idx > total_frames * 0.9:  # Don't scan last 10%
                    break

            cap.release()

            # Post-process
            all_texts = [item["text"] for item in result["extracted_text"]["all_strings"]]
            result["extracted_text"]["unique_strings"] = sorted(list(set(all_texts)))
            result["extracted_text"]["frame_count_scanned"] = frame_idx // step + 1
            if confidences:
                result["extracted_text"]["ocr_confidence_avg"] = round(sum(confidences) / len(confidences), 2)

        # ————————————————————————
        # 2. Full ffprobe metadata (container + streams + all tags)
        # ————————————————————————
        try:
            cmd = [
                "ffprobe", "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                "-show_chapters",
                self.path
            ]
            output = subprocess.check_output(cmd, text=True, timeout=60)
            result["metadata"] = json.loads(output)
        except Exception as e:
            result["metadata"]["error"] = str(e)

        # ————————————————————————
        # 3. Extract embedded subtitles (if any)
        # ————————————————————————
        try:
            cmd_subs = [
                "ffmpeg", "-i", self.path,
                "-map", "0:s?",  # All subtitle streams
                "-f", "srt", "-"
            ]
            subtitle_output = subprocess.check_output(
                cmd_subs, stderr=subprocess.STDOUT, text=True, timeout=30
            )
            if "No subtitles" not in subtitle_output and "Invalid data" not in subtitle_output:
                result["embedded_subtitles"] = subtitle_output.strip().split('\n\n')
        except:
            pass  # No subtitles or error → leave empty

        # ————————————————————————
        # 4. File hashes (MD5 + SHA256)
        # ————————————————————————
        try:
            with open(self.path, "rb") as f:
                content = f.read()
                result["hashes"]["md5"] = hashlib.md5(content).hexdigest()
                result["hashes"]["sha256"] = hashlib.sha256(content).hexdigest()
        except:
            result["hashes"]["error"] = "Could not compute hash"

        return result