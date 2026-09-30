import sys
with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i in range(2380, -1, -1):
    if lines[i].startswith("def "):
        print(f"Line {i}: {lines[i].strip()}")
        break
