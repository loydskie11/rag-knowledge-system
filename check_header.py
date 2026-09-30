with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "CAR / PAR Form 3" in line and "Master Logsheet" in line:
        for j in range(i-5, i+25):
            print(lines[j].strip())
        break
