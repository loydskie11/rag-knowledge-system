import re

with open('backend/Dockerfile', 'r', encoding='utf-8') as f:
    text = f.read()

# Add a downgrade for bcrypt to fix the passlib __about__ bug without breaking cache
pattern = r'(RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 libgomp1 && rm -rf /var/lib/apt/lists/\*)'
replacement = r'\1\n\n# Fix passlib compatibility bug instantly without breaking cache\nRUN pip install --no-cache-dir bcrypt==3.2.2'

text, count = re.subn(pattern, replacement, text)

print(f"Replaced {count} occurrences")
with open('backend/Dockerfile', 'w', encoding='utf-8') as f:
    f.write(text)
