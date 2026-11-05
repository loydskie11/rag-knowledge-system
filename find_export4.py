import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "const handleExportCarForm =" in line:
        print(f"handleExportCarForm starts at {i}")
    if "navigate(\"/app/document-generator\"" in line:
        print(f"navigate at {i}")
