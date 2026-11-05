import re
with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "r", encoding="utf-8") as f:
    content = f.read()
for match in re.finditer(r'apiClient\.post\("/upload', content):
    start = max(0, match.start() - 100)
    end = min(len(content), match.start() + 400)
    print("---")
    print(content[start:end])
