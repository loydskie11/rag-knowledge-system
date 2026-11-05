with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const handleUploadSubmit" in line or "const handleUpdateSubmit" in line:
        print("".join(lines[i:i+40]))
