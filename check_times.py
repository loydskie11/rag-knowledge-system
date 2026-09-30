import sys
with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "times new roman" in line.lower() or "times" in line.lower():
        print(f"DocumentGenerator Line {i}: {line.strip()}")
