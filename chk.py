import sys
with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    text = f.read()
if "Times New Roman" in text:
    print("DocumentGenerator has Times New Roman!")
