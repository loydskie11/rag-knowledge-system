with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the state initialization of newCarForm
for i, line in enumerate(lines):
    if "const [newCarForm, setNewCarForm]" in line:
        print(f"--- line {i} ---")
        for j in range(i, i+30):
            print(lines[j].strip())
        break
