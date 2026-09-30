import sys
with open(r"c:\Projects\rag-governance\backend\models.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "class CARForm(Base):" in line:
        print(f"CARForm at {i}")
    if "class ISORequirement(Base):" in line:
        print(f"ISORequirement at {i}")
