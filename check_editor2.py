import sys

with open("c:/Projects/rag-governance/src/app/pages/DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

idx_start = content.find('if (view === "editor") {')
if idx_start != -1:
    print(content[idx_start:idx_start+2000])
