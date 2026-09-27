import sys

with open("c:/Projects/rag-governance/backend/main.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('model="qwen2.5",', 'model="llama3.1",')

with open("c:/Projects/rag-governance/backend/main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Set model to llama3.1")
