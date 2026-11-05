import os
import json
from supabase import create_client

url = os.environ.get("SUPABASE_URL", "https://rcnmrjjuhrbluhxomnzv.supabase.co")
key = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbm1yamp1aHJibHVoeG9tbnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM5MDM0OSwiZXhwIjoyMDkxOTY2MzQ5fQ.iZId04aGPBVSk6GK7AUInTB7YlNviKeEsjncGpUjVpY")
supabase = create_client(url, key)

# Create a test row with 384 dimensions
meta = {"name": "Test Update Row", "category": "Template", "version": "1"}
res = supabase.table("document_sections").insert({"content": "hello", "metadata": meta, "embedding": [0]*384}).execute()
print("Inserted test row.")

# Now update it like backend does
meta["content_html"] = "<p>Test html</p>"
supabase.table("document_sections").update({"metadata": meta}).eq("metadata->>name", "Test Update Row").execute()
print("Updated test row.")

# Fetch all names
res2 = supabase.table("document_sections").select("metadata").execute()
found = False
for row in res2.data:
    m = row.get("metadata")
    if m and isinstance(m, dict) and m.get("name") == "Test Update Row":
        found = True
        print(f"Found it! {m}")
if not found:
    print("WARNING: Row disappeared from select!")

# Delete it
supabase.table("document_sections").delete().eq("metadata->>name", "Test Update Row").execute()
