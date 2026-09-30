import json
from supabase import create_client

url = "https://rcnmrjjuhrbluhxomnzv.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbm1yamp1aHJibHVoeG9tbnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM5MDM0OSwiZXhwIjoyMDkxOTY2MzQ5fQ.iZId04aGPBVSk6GK7AUInTB7YlNviKeEsjncGpUjVpY"
supabase = create_client(url, key)

res = supabase.table("document_sections").select("id, metadata").ilike("metadata->>name", "%MEMO TEMPLATE%").order("id", desc=True).execute()

print(f"Found {len(res.data)} chunks for MEMO TEMPLATE")
for row in res.data:
    meta = row["metadata"]
    if isinstance(meta, str):
        meta = json.loads(meta)
    print(f"ID: {row['id']} | Status: {meta.get('status')} | Category: {meta.get('category')} | Name: {meta.get('name')}")
