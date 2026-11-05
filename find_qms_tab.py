with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
in_else = False
for i, line in enumerate(lines):
    if 'isoSubTab === "clauses" ?' in line:
        pass
    if '/* --- QMS ACTION PLANS TAB CONTENT --- */' in line:
        print("".join(lines[i-5:i+30]))
        break
