
import subprocess
import re
from typing import Dict
import logging
import os
from PIL import Image  # For image conversion
import shutil  # For cleanup
import sys
import json
import binascii 
from django.conf import settings
import uuid
def ensure_response_dir():
    upload_dir = settings.RESPONSE_ROOT
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

def save_result_as_json(result: Dict) -> str:
    """Save the steganography result as a JSON file and return the filename."""
    upload_dir = os.path.join(ensure_response_dir(), "steganography")
    os.makedirs(upload_dir, exist_ok=True)
    unique_filename = f"{uuid.uuid4().hex}.json"
    file_path = os.path.join(upload_dir, unique_filename)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=4)
    logger.info(f"Saved steganography result to: {file_path}")
    return unique_filename
logger = logging.getLogger(__name__)

def find_zsteg_executable() -> str:
    """
    Locate the zsteg executable in common Ruby paths or system PATH.
    """
    possible_paths = [
        r"C:\Ruby34-x64\bin\zsteg.bat",
        r"C:\Ruby34-x64\bin\zsteg",
        r"C:\Ruby32-x64\bin\zsteg.bat",
        r"C:\Ruby31-x64\bin\zsteg.bat",
        shutil.which("zsteg")  # Check system PATH
    ]
    for path in possible_paths:
        if path and os.path.exists(path):
            logger.debug(f"Found zsteg at: {path}")
            return path
    logger.error("Zsteg executable not found in expected paths")
    return None

def convert_to_png(image_path: str) -> str:
    """Convert non-PNG/BMP images to PNG format."""
    try:
        with Image.open(image_path) as img:
            png_path = f"{os.path.splitext(image_path)[0]}_converted.png"
            img.save(png_path, "PNG")
            logger.info(f"Converted {image_path} to PNG: {png_path}")
            return png_path
    except Exception as e:
        logger.error(f"Conversion failed for {image_path}: {str(e)}")
        return None

def sanitize_string(s: str) -> str:
    """Sanitize string for JSON serialization by escaping special characters."""
    if not s:
        return ""
    try:
        # Use json.dumps to escape special characters, then strip quotes
        return json.dumps(s, ensure_ascii=False)[1:-1]
    except Exception as e:
        logger.warning(f"Failed to sanitize string: {str(e)}")
        return s.encode('unicode_escape').decode('ascii')

def string_to_hex(s: str) -> str:
    """Convert a string to its hexadecimal representation."""
    try:
        return binascii.hexlify(s.encode('utf-8')).decode('ascii')
    except Exception as e:
        logger.warning(f"Failed to convert string to hex: {str(e)}")
        return ""

def detect_zsteg_steganography(image_path: str) -> Dict:
    """
    Run zsteg on a PNG/BMP file and parse the output for steganographic content.
    """
    logger.info(f"Running zsteg on {image_path}")
    zsteg_path = find_zsteg_executable()
    if not zsteg_path:
        logger.error("Zsteg not installed or not found in PATH")
        return {"error": "zsteg not installed"}

    try:
        # Debug PATH environment
        logger.debug(f"Current PATH: {os.environ.get('PATH', '')}")

        # Run zsteg with focused options (RGB, LSB, verbose)
        result = subprocess.run(
            [zsteg_path, image_path, "-c", "rgb", "-b", "1", "-v"],
            capture_output=True,
            text=True,
            check=True
        )
        output = result.stdout.strip()
        logger.debug(f"Zsteg output: {output}")

        # Parse output for meaningful data
        extracted_data = []
        hex_data = []
        for line in output.splitlines():
            if "text:" in line or "file:" in line:
                # Extract text or file data (e.g., "text: 'Lorem ipsum...'")
                match = re.search(r"(text|file):\s*(?:['\"](.*?)['\"]|(\S+))", line)
                if match:
                    data = match.group(2) or match.group(3)
                    if data and len(data.strip()) > 10:  # Filter short/noisy data
                        sanitized = sanitize_string(data.strip())
                        extracted_data.append(sanitized)
                        hex_data.append(string_to_hex(data.strip()))

        # Sanitize raw output and limit size
        max_output_size = 10000  # Limit to 10KB to avoid overwhelming frontend
        sanitized_output = sanitize_string(output[:max_output_size])
        hex_output = string_to_hex(output[:max_output_size])

        if extracted_data:
            return {
                "stego_detected": True,
                "extracted_data": extracted_data,
                "hex_data": hex_data,  # Hex representation for frontend
                "raw_output": sanitized_output,
                "hex_output": hex_output  # Hex of raw output
            }
        return {
            "stego_detected": False,
            "extracted_data": [],
            "hex_data": [],
            "raw_output": sanitized_output,
            "hex_output": hex_output,
            "message": "No meaningful steganographic content found"
        }

    except subprocess.CalledProcessError as e:
        logger.error(f"Zsteg error: {e.stderr}")
        sanitized_error = sanitize_string(e.stderr)
        return {
            "stego_detected": False,
            "error": sanitized_error,
            "raw_output": sanitize_string(e.stdout),
            "hex_output": string_to_hex(e.stdout[:10000])
        }
    except FileNotFoundError:
        logger.error(f"Zsteg executable not found at {zsteg_path}")
        return {"error": "zsteg not installed"}

def detect_steganography(image_path: str) -> Dict:
    """
    Detect steganography based on file extension, converting if necessary.
    """
    logger.info(f"Detecting steganography for {image_path}")
    print("------------------------Started Steganographic detection-------------------------------")
    ext = os.path.splitext(image_path)[1].lower()
    converted_path = None
    try:
        if ext not in ('.png', '.bmp'):
            logger.info(f"Unsupported format {ext}, converting to PNG")
            converted_path = convert_to_png(image_path)
            if not converted_path:
                return {"stego_detected": False, "error": "File conversion failed"}
            image_path = converted_path  # Use converted PNG for detection

        result = detect_zsteg_steganography(image_path)
        print("----------------Ended Steganography---------------------")
        filename = save_result_as_json(result)
        return {"filename": filename}
    finally:
        # Clean up converted file
        if converted_path and os.path.exists(converted_path):
            try:
                os.remove(converted_path)
                logger.info(f"Cleaned up temporary file: {converted_path}")
            except PermissionError:
                logger.warning(f"Permission denied when deleting {converted_path}")

if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.DEBUG)  
    if len(sys.argv) > 1:
        result = detect_steganography(sys.argv[1])
        print(result)
    else:
        print({"error": "No file path provided"})