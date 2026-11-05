import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL", "https://rcnmrjjuhrbluhxomnzv.supabase.co")
key = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbm1yamp1aHJibHVoeG9tbnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM5MDM0OSwiZXhwIjoyMDkxOTY2MzQ5fQ.iZId04aGPBVSk6GK7AUInTB7YlNviKeEsjncGpUjVpY")
supabase = create_client(url, key)

# 1. Insert dummy
meta = {"name": "MY TEST DOC", "category": "Template", "version": "1"}
res = supabase.table("document_sections").insert({"content": "hello", "metadata": meta, "embedding": [0]*1536}).execute()
row_id = res.data[0]["id"]
print(f"Inserted dummy doc id={row_id}")

# 2. Update dummy
meta["content_html"] = "<p>hello</p>"
supabase.table("document_sections").update({"metadata": meta}).eq("metadata->>name", "MY TEST DOC").execute()

# 3. Read it back
res2 = supabase.table("document_sections").select("id, metadata").eq("id", row_id).execute()
print("After update:")
print(res2.data)
