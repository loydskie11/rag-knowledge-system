with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "Section 2" in line or "Corrective Measure" in line:
        print(f"---{i}---")
        print("".join(lines[i:i+5]))
