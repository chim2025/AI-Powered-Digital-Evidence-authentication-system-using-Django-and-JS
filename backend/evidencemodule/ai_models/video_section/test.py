import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
from PIL import Image
import requests
from io import BytesIO

# Test with a simple online image containing text
url = "https://global.ariseplay.com/amg/www.thisdaylive.com/uploads/Tinubu-54.jpg"
img = Image.open(BytesIO(requests.get(url).content))

try:
    text = pytesseract.image_to_string(img)
    print("Tesseract is WORKING!\n")
    print(text)
except Exception as e:
    print("Still broken:", e)