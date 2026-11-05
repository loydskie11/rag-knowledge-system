import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "Add Corrective Action Request" in line or "Add CAR Form" in line or "Create CAR" in line or "Save CAR Form" in line:
        print(f"Modal at {i}: {line.strip()}")
