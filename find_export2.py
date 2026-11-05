import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i in range(1030, -1, -1):
    if "handleExportCarForm" in lines[i]:
        print(f"Found handleExportCarForm at {i}: {lines[i].strip()}")
