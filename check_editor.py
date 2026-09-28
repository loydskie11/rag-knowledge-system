with open("c:/Projects/rag-governance/src/app/pages/DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

idx = content.find('if (view === "editor") {')
if idx != -1:
    print(content[idx:idx+1500])
