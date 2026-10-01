import re

with open('backend/Dockerfile', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the previous Pillow patch with a comprehensive patch for all missing modules
text = re.sub(
    r'RUN pip install --no-cache-dir Pillow',
    r'RUN pip install --default-timeout=1000 --no-cache-dir Pillow passlib python-jose ollama paddleocr paddlepaddle bcrypt',
    text
)

# Also ensure passlib[bcrypt] is covered by installing bcrypt explicitly

with open('backend/Dockerfile', 'w', encoding='utf-8') as f:
    f.write(text)
