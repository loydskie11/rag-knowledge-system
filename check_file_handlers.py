with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "const handleFileSelect" in line or "const handleDrop" in line or "const handleUploadSubmit" in line:
        print("".join(lines[i:i+15]))
