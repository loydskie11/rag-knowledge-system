import re

with open('src/app/pages/DocumentGenerator.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = re.sub(r'<Sparkles[^>]*/>\s*', '', c)
c = re.sub(r'<FileText[^>]*/>\s*', '', c)

with open('src/app/pages/DocumentGenerator.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("Icons removed.")
