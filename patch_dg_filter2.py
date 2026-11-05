import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r'(const filtered = res\.data\.filter\(d =>\s*)(d\.category === "Template" \|\|\s*d\.category === "Accreditation Evidence" \|\|\s*\(d\.name && d\.name\.toUpperCase\(\)\.includes\("TEMPLATE"\)\))(\s*\);)',
    r'\1(\2) && d.status !== "Archived"\3',
    content,
    flags=re.MULTILINE
)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched DocumentGenerator.tsx filter successfully!")
