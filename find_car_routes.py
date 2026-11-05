import sys
with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "@app.get(\"/car-forms\"" in line:
        print(f"GET /car-forms at {i}")
    if "@app.post(\"/car-forms\"" in line:
        print(f"POST /car-forms at {i}")
