import sys
with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "@app.put(\"/iso/requirements/{req_id}/status\"" in line:
        print(f"Line {i}")
