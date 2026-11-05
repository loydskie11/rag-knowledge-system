import re
with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "r", encoding="utf-8") as f:
    content = f.read()

match = re.search(r'const fetchDocuments = .*?\{.*?\n.*?\}', content, re.DOTALL)
if not match:
    # Try another pattern
    match = re.search(r'(const fetch[a-zA-Z0-9_]* =.*?\{.*?})', content, re.DOTALL)

if match:
    print(match.group(0)[:500])
else:
    print("Not found fetch")
