import requests

url = "https://rcnmrjjuhrbluhxomnzv.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbm1yamp1aHJibHVoeG9tbnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM5MDM0OSwiZXhwIjoyMDkxOTY2MzQ5fQ.iZId04aGPBVSk6GK7AUInTB7YlNviKeEsjncGpUjVpY"

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
