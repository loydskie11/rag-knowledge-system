import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the entire filter logic block
pattern = r'(apiClient\.get\("/documents"\)\.then\(res => \{.*?)const filtered = res\.data\.filter\(d =>.*?setTemplates\(filtered\);(.*?\})'
replacement = r'\1const filtered = res.data.filter(d => d.category === "Forms / Templates" && d.status !== "Archived");\n        setTemplates(filtered);\2'

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Updated filter in DocumentGenerator.tsx to strictly use Forms / Templates")
