with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = re.finditer(r'files?\[0\]', content)
for m in matches:
    start = max(0, m.start() - 200)
    end = min(len(content), m.end() + 200)
    print("---")
    print(content[start:end])
