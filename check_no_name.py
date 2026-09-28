import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL", "https://rcnmrjjuhrbluhxomnzv.supabase.co")
key = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbm1yamp1aHJibHVoeG9tbnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM5MDM0OSwiZXhwIjoyMDkxOTY2MzQ5fQ.iZId04aGPBVSk6GK7AUInTB7YlNviKeEsjncGpUjVpY")

supabase = create_client(url, key)
res = supabase.table("document_sections").select("id, metadata").execute()
for row in res.data:
    meta = row.get("metadata")
    if meta and isinstance(meta, dict):
        name = meta.get("name")
        if not name:
            print(f"ID: {row['id']} has no name! Meta: {meta}")
