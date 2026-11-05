with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "for (const [placeholder, val] of Object.entries(textReplacements))" in line:
        print("".join(lines[i:i+25]))
        break
