with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
in_edit = False
for i, line in enumerate(lines):
    if "setShowEditCarModal(false)" in line or "Edit CAR Form" in line:
        if not in_edit:
            print("FOUND EDIT MODAL START")
            in_edit = True
            print("".join(lines[i-2:i+30]))
            break
