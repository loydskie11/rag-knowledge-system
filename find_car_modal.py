with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

in_modal = False
for i, line in enumerate(lines):
    if "Issue Corrective Action Request (CAR Form 1)" in line or "Add CAR Form" in line:
        print("FOUND MODAL AT LINE", i)
        print("".join(lines[i:i+40]))
        break
