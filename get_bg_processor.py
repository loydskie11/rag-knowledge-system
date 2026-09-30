with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "def process_document_background" in line:
        for j in range(i+20, i+60):
            print(lines[j].strip())
        break
