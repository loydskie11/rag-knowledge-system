import re
import requests

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

url = re.search(r'SUPABASE_URL\s*=\s*os\.getenv\("SUPABASE_URL",\s*"(.*?)"\)', content)
if not url:
    url = "https://rcnmrjjuhrbluhxomnzv.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbm1yamp1aHJibHVoeG9tbnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM5MDM0OSwiZXhwIjoyMDkxOTY2MzQ5fQ.iZId04aGPBVSk6GK7AUInTB7YlNviKeEsjncGpUjVpY"

headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
res = requests.post(f"{url}/storage/v1/object/list/documents", headers=headers, json={"prefix": "", "limit": 100, "offset": 0})
for item in res.json():
    name = item.get("name", "").lower()
    if "car" in name or "template" in name:
        print(item["name"])
