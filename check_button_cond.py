with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "Issue CAR" in line and "AlertTriangle" in lines[i-1]:
        print("".join(lines[i-15:i+5]))
        break
