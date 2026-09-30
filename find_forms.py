import sys
with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'Forms / Templates' in line:
        print(f"Line {i}")
