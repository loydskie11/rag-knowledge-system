import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

# We need to find the broken f-string and fix it
broken_string = """                            {
                                "type": "text", 
                                "text": f"{system_prompt}

Please extract the data from this image."
                            },"""

fixed_string = """                            {
                                "type": "text", 
                                "text": f"{system_prompt}\\n\\nPlease extract the data from this image."
                            },"""

content = content.replace(broken_string, fixed_string)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed f-string.")
