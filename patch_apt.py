import re

with open('backend/Dockerfile', 'r', encoding='utf-8') as f:
    text = f.read()

# Add a secondary apt-get install after the pip installs to safely add OpenCV/PaddleOCR system dependencies
pattern = r'(RUN pip install --default-timeout=1000 --no-cache-dir Pillow passlib python-jose ollama paddleocr paddlepaddle bcrypt)'
replacement = r'\1\n\n# Install missing system dependencies for PaddleOCR/OpenCV instantly without breaking cache\nRUN apt-get update && apt-get install -y libgl1 libglib2.0-0 libgomp1 && rm -rf /var/lib/apt/lists/*'

text, count = re.subn(pattern, replacement, text)

print(f"Replaced {count} occurrences")
with open('backend/Dockerfile', 'w', encoding='utf-8') as f:
    f.write(text)
