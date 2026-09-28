import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

if "CheckCircle2" not in content[:1000]:
    content = content.replace("FileText,", "FileText, CheckCircle2,")
    with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Added CheckCircle2 to imports")
else:
    print("CheckCircle2 already in imports")
