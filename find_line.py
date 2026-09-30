import sys
with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "const [previewFragments, setPreviewFragments]" in line:
        print(f"Found at {i}")
        break
