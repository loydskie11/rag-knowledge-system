with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "Edit Corrective Action Request" in line:
        print("FOUND EDIT JSX", i)
        print("".join(lines[i-2:i+40]))
        break
