import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "const [newCarForm, setNewCarForm] = useState({" in line:
        print(f"Line {i}")
