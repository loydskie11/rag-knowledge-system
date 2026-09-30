with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find handleCreateCarSubmit
for i, line in enumerate(lines):
    if "const handleCreateCarSubmit" in line or "const handleEditCarSubmit" in line:
        print(f"--- line {i} ---")
        for j in range(i, i+50):
            print(lines[j].strip())
        break
