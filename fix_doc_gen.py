import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_block = """        if (bodyPh) {
          finalHtml = finalHtml.split(bodyPh).join(aiBody);
        } else {
          finalHtml += `<br/><br/>${aiBody}`;
        }"""

new_block = """        if (bodyPh) {
          finalHtml = finalHtml.split(bodyPh).join(aiBody);
        }"""

content = content.replace(old_block, new_block)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Force append removed.")
