import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'apiClient.get("/documents").then(res => {',
    'apiClient.get("/documents", { params: { category: "Forms / Templates" } }).then(res => {'
)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Added category param back to API call.")
