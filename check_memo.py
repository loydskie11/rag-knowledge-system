from supabase import create_client
import json

url = "https://rcnmrjjuhrbluhxomnzv.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbm1yamp1aHJibHVoeG9tbnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM5MDM0OSwiZXhwIjoyMDkxOTY2MzQ5fQ.iZId04aGPBVSk6GK7AUInTB7YlNviKeEsjncGpUjVpY"
supabase = create_client(url, key)

res = supabase.table("document_sections").select("id, metadata").ilike("metadata->>name", "MEMORANDUM TEMPLATE").execute()

active_chunks = []
for r in res.data:
    meta = r.get("metadata", {})
    if isinstance(meta, str):
        try: meta = json.loads(meta)
        except: pass
    if meta.get("status") != "Archived":
        r["metadata"] = meta
        active_chunks.append(r)

for row in active_chunks:
    meta = row["metadata"]
    html = meta.get('content_html', '')
    print(f"ID {row['id']} content length: {len(html)}")
    print(html)
