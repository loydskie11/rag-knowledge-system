import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const handleExportCarForm = async" in line:
        print(f"Found at line {i}")
        for j in range(i, i+90):
            print(f"{j}: {lines[j]}", end="")
        break
