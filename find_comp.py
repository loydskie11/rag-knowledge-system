import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i in range(1030, -1, -1):
    if "function " in lines[i] or "const " in lines[i] and "=>" in lines[i]:
        print(f"Found component at {i}: {lines[i].strip()}")
        if "function" in lines[i] or ": React.FC" in lines[i]:
            break
