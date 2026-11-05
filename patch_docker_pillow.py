import re

with open('backend/Dockerfile', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'(RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt)'
replacement = r'\1\n\n# Install missing dependencies instantly without breaking cache\nRUN pip install --no-cache-dir Pillow'

text, count = re.subn(pattern, replacement, text)

print(f"Replaced {count} occurrences")
with open('backend/Dockerfile', 'w', encoding='utf-8') as f:
    f.write(text)
