import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("const HEADER_AREA_HEIGHT = 135;", "const HEADER_AREA_HEIGHT = 95;")
content = content.replace("const FOOTER_AREA_HEIGHT = 100;", "const FOOTER_AREA_HEIGHT = 65;")

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Adjusted header/footer height constants.")
