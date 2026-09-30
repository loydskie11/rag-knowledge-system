import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = 'date_issued: data.date_issued || data.date || "",'
replacement = '''date_issued: (() => {
                                const rawDate = data.date_issued || data.date || "";
                                if (!rawDate) return "";
                                const d = new Date(rawDate);
                                return isNaN(d.getTime()) ? "" : d.toISOString().split('T')[0];
                              })(),'''

if target in content:
    content = content.replace(target, replacement)
    with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Added foolproof JS date parsing!")
else:
    print("Could not find the target string in AccreditationSupport.tsx.")
