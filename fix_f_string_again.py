import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

broken_str = """                            "type": "text", 
                            "text": f"{system_prompt}

Please extract the data from this CAR form image into the requested JSON format."
                        },"""

fixed_str = """                            "type": "text", 
                            "text": f"{system_prompt}\\n\\nPlease extract the data from this CAR form image into the requested JSON format."
                        },"""

content = content.replace(broken_str, fixed_str)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Syntax fixed")
