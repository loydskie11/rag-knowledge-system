import sys
with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "setPreviewFragments" in line:
        print(f"Found setPreviewFragments at {i}: {line.strip()}")
