with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the "confirmIsoStatusUpdate" function definition to see if it also triggers a revoke/status confirm
for i, line in enumerate(lines):
    if "const confirmIsoStatusUpdate" in line:
        print(f"--- line {i} ---")
        for j in range(i, i+15):
            print(lines[j].strip())
        break

# Find showIsoStatusModal to understand what shows up on cancel
for i, line in enumerate(lines):
    if "showIsoStatusModal" in line:
        print(f"line {i}: {line.strip()}")
