with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Verify CHECKED character is the actual ☑ (not a 6-char escape)
for i, line in enumerate(lines):
    if "const CHECKED =" in line:
        raw = lines[i]
        is_actual_char = "\u2611" in raw
        print(f"Line {i}: is actual ☑ char = {is_actual_char}")
        print("  Raw:", raw.strip())
        break
