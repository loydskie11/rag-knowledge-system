import sys
with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "fontFamily" in line or "font-family" in line or "style=" in line:
        print(f"Line {i}: {line.strip()}")
