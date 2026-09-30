import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
count = 0
for i, line in enumerate(lines):
    if "<IsoTabContent" in line:
        count += 1
print(f"Total instantiations: {count}")
