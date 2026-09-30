import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i in range(1030, -1, -1):
    if lines[i].startswith("function ") or lines[i].startswith("export function ") or lines[i].startswith("const "):
        print(f"{i}: {lines[i].strip()}")
        if lines[i].startswith("function ") or lines[i].startswith("export function "): break
