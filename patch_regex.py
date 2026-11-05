import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'd\.category === "Template" \|\|',
    r'd.category === "Template" || d.category === "Forms / Templates" ||',
    content
)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Regex patched DocumentGenerator.tsx successfully!")
