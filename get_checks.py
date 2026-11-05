with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()
import re
matches = re.finditer(r'\[CHECK_.*?\]', content)
for m in matches:
    print(m.group(0))
