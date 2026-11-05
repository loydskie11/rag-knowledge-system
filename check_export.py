import sys
sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const handleExportCarForm = async" in line:
        # Print from start to the next top-level const declaration
        j = i
        brace_count = 0
        started = False
        for j in range(i, min(i+250, len(lines))):
            stripped = lines[j].strip()
            if "{" in stripped: brace_count += stripped.count("{")
            if "}" in stripped: brace_count -= stripped.count("}")
            if j == i: started = True
            if started and brace_count <= 0 and j > i:
                # End of function
                for k in range(i, j+5):
                    print(f"{k}: {lines[k]}", end="")
                break
        break
