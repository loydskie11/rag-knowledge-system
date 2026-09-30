import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const CHECKED =" in line:
        raw = lines[i]
        is_actual_char = "\u2611" in raw
        print(f"Line {i}: is_actual_char={is_actual_char}")
        print(f"  Raw: {raw.strip()}")
        break
