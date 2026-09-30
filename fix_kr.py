import re

with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target1 = 'accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"'
repl1 = 'accept=".pdf,.docx,.txt,.html,.png,.jpg,.jpeg"'
content = content.replace(target1, repl1)

target2 = 'PDF, DOCX, TXT, PNG, JPG up to 10MB'
repl2 = 'PDF, DOCX, TXT, HTML, PNG, JPG up to 10MB'
content = content.replace(target2, repl2)

target3 = 'PDF, DOCX, TXT, or Image up to 10MB'
repl3 = 'PDF, DOCX, TXT, HTML, or Image up to 10MB'
content = content.replace(target3, repl3)

with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated HTML attributes and text in KnowledgeRepository.tsx")
