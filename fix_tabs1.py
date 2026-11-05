with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re

# 1. Remove the QMS tab button
btn_pattern = r'''\s*<button\s*onClick=\{\(\) => setIsoSubTab\("qms"\)\}[\s\S]*?QMS Action Plans \(\{qmsStats\.total\}\)\s*</button>'''
content = re.sub(btn_pattern, "", content)

# 2. Rename the CAR Logsheet tab button
car_btn_pattern = r'''CAR Logsheet \(\{carForms \? carForms\.length : 0\}\)'''
content = re.sub(car_btn_pattern, r'''CAR / PAR Form 3 ({carForms ? carForms.length : 0})''', content)

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated tab navigation buttons.")
