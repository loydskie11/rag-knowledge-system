import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

print("handleWizardTemplateSelect found:", content.find("const handleWizardTemplateSelect"))
print("handleWizardGenerate found:", content.find("const handleWizardGenerate"))
print("wizard mapping code found:", content.find("for (const ph of wizardPlaceholders) {"))
