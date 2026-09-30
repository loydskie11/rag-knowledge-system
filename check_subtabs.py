with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'isoSubTab === "clauses" ?' in line:
        print("FOUND CLAUSES TAB START at", i)
        print("".join(lines[i-15:i+10]))
