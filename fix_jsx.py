with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if ") : (" in line and "/* --- QMS ACTION PLANS TAB CONTENT --- */" in lines[i+1]:
        start_idx = i
    if "{/* === ISSUE CAR FORM 1 MODAL === */}" in line:
        end_idx = i

if start_idx != -1 and end_idx != -1:
    print(f"Deleting from {start_idx} to {end_idx}")
    new_lines = lines[:start_idx] + ["            )}\n\n"] + lines[end_idx:]
    with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    print("Fixed!")
else:
    print("Could not find bounds", start_idx, end_idx)
