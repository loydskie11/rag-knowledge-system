with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "\"[FOLLOWUP_DATE]\":" in line:
        print("".join(lines[i-2:i+5]))
        break
