import re

with open('src/app/pages/DocumentGenerator.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

pattern = r'(f\.includes\("MRC Form 4"\))'
replacement = r'\1 ||\n          f.includes("MRC Form 3")'

text, count = re.subn(pattern, replacement, text)

print(f"Replaced {count} occurrences")
with open('src/app/pages/DocumentGenerator.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
