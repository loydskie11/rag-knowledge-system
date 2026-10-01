import re

with open('backend/Dockerfile', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    'RUN pip install --no-cache-dir -r requirements.txt',
    'RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt'
)

with open('backend/Dockerfile', 'w', encoding='utf-8') as f:
    f.write(text)
