import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

broken_string2 = """                    {"role": "user", "content": f"Here is the raw OCR text extracted from the CAR Form 1:

{raw_text}"}"""

fixed_string2 = """                    {"role": "user", "content": f"Here is the raw OCR text extracted from the CAR Form 1:\\n\\n{raw_text}"}"""

content = content.replace(broken_string2, fixed_string2)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed second f-string.")
