import re
with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()
match = re.search(r'def login_user\(.*?\n(.*?)\n@', content, re.DOTALL)
if match:
    print(match.group(1)[:500])
else:
    print("Not found")
