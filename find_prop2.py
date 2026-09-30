import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "<IsoTabContent" in line:
        for j in range(i, i+150):
            if "/>" in lines[j]:
                print(f"Found end at {j}: {lines[j].strip()}")
                for k in range(j-5, j+2):
                    print(f"{k}: {lines[k].strip()}")
                break
