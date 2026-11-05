import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

target1 = 'if not filename_lower.endswith((".pdf", ".png", ".jpg", ".jpeg", ".txt", ".docx")):'
repl1 = 'if not filename_lower.endswith((".pdf", ".png", ".jpg", ".jpeg", ".txt", ".docx", ".html")):'
content = content.replace(target1, repl1)

target2 = 'detail="Unsupported file format. Please upload PDF, DOCX, TXT, or Image."'
repl2 = 'detail="Unsupported file format. Please upload PDF, DOCX, TXT, HTML, or Image."'
content = content.replace(target2, repl2)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated backend upload validation!")
