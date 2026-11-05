import re

with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    '<option value="Forms / Templates">Forms / Templates</option>',
    '<option value="Forms / Templates">Forms / Templates</option>\n                  <option value="Branding Asset">Branding Asset</option>'
)

with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched KnowledgeRepository.tsx filter successfully!")
