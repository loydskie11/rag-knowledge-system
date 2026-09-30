import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i in range(1370, 1600):
    if lines[i].strip() == "</div>" and "{" in lines[i-1] or "}" in lines[i+1]:
        print(f"Div at {i}: {lines[i].strip()}")
