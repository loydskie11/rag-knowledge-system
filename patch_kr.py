import re

with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace <option>Procedure / Guideline</option> with itself plus <option>Branding Asset</option>
content = content.replace(
    "<option>Procedure / Guideline</option>",
    "<option>Procedure / Guideline</option>\n                      <option>Branding Asset</option>"
)

with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched KnowledgeRepository.tsx successfully!")
