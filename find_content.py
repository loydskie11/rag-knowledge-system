with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if 'isoSubTab === "clauses" ? (' in line:
        print("CLAUSES AT", i)
    if '/* --- QMS ACTION PLANS TAB CONTENT --- */' in line:
        print("QMS AT", i)
