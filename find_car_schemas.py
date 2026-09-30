import sys
with open(r"c:\Projects\rag-governance\backend\schemas.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "class CARFormCreate" in line or "class CARFormUpdate" in line or "class CARFormResponse" in line:
        print(f"Line {i}: {line.strip()}")
