import re
with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()
url = re.search(r'SUPABASE_URL\s*=\s*os\.getenv\("SUPABASE_URL",\s*"(.*?)"\)', content).group(1)
key = re.search(r'SUPABASE_KEY\s*=\s*os\.getenv\("SUPABASE_KEY",\s*"(.*?)"\)', content).group(1)

import requests
headers = {"apikey": key, "Authorization": f"Bearer {key}"}
res = requests.get(f"{url}/rest/v1/document_sections?select=metadata", headers=headers)
data = res.json()
names = set()
for r in data:
    meta = r.get("metadata", {})
    if isinstance(meta, dict):
        if "name" in meta:
            names.add(meta["name"])
        elif "title" in meta:
            names.add(meta["title"])
print("DOCUMENTS IN SUPABASE:")
for name in names:
    print(name)
