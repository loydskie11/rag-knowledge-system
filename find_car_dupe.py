with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "Corrective Action Logsheet (CAR Form 3)" in line:
        print("FOUND Corrective Action Logsheet at", i)
        print("".join(lines[i-15:i+15]))
