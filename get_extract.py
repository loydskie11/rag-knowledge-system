with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "corrective_measure: data.corrective_measure ||" in line:
        print("".join(lines[i-1:i+3]))
        break
