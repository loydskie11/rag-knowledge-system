import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "<IsoTabContent" in line:
        for j in range(i, i+50):
            if "handleExportCarForm" in lines[j]:
                print(f"Prop passed at {j}")
            if "/>" in lines[j] or "</IsoTabContent>" in lines[j]:
                print(f"End at {j}")
                break
