import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "Add Corrective Action Request (CAR)" in line:
        print(f"Line {i}")
