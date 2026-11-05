import re

with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("uploaded_by: userEmail,", "uploaded_by: sessionStorage.getItem('userEmail') || 'Unknown',")

with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed userEmail reference error.")
