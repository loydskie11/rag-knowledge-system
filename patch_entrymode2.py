import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(r'setView\(entryMode === "template" \? "templates" : "compose"\);', 'setView("wizard");', content)
content = re.sub(r'if \(entryMode !== "template"\) setPrompt\(""\);', '', content)
content = re.sub(r'\{entryMode === "template" \? "Back to Templates" : "New Prompt"\}', '"Back to Wizard"', content)
content = re.sub(r'\{entryMode === "template" \? "KNOWLEDGE REPOSITORY DOCUMENT" : "AI DOCUMENT GENERATOR"\}', '{activeTemplateId ? "TEMPLATE DOCUMENT" : "AI DOCUMENT GENERATOR"}', content)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Regex replaced entryMode!")
