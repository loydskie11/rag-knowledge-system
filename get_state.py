with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re
matches = re.finditer(r'iso_clause_id: "", car_no: "",.*?\n.*?\n.*?', content)
for match in matches:
    print(match.group(0))
