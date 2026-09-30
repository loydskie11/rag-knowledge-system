from supabase import create_client
import json

url = "https://rcnmrjjuhrbluhxomnzv.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbm1yamp1aHJibHVoeG9tbnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM5MDM0OSwiZXhwIjoyMDkxOTY2MzQ5fQ.iZId04aGPBVSk6GK7AUInTB7YlNviKeEsjncGpUjVpY"
supabase = create_client(url, key)

res = supabase.table("document_sections").select("id, metadata").ilike("metadata->>name", "MEMORANDUM TEMPLATE").execute()

for row in res.data:
    meta = row.get("metadata", {})
    if isinstance(meta, str):
        meta = json.loads(meta)
    
    html = meta.get("content_html", "")
    if html:
        # Fix split brackets
        html = html.replace("<strong>[</strong><strong>SENDER OFFICE]</strong>", "<strong>[SENDER OFFICE]</strong>")
        html = html.replace("<strong>[</strong><strong>SUBJECT]</strong>", "<strong>[SUBJECT]</strong>")
        
        # Add bottom borders if not already added
        if "border-bottom: 2px solid black" not in html:
            html = html.replace("<strong>[SENDER OFFICE]</strong></p>", "<strong>[SENDER OFFICE]</strong></p>\n<div style=\"border-bottom: 2px solid black; margin: 10px 0;\"></div>")
        
        if "border-bottom: 1.5px solid black" not in html:
            html = html.replace("SUBJECT: <strong>[SUBJECT]</strong></p>", "SUBJECT: <strong>[SUBJECT]</strong></p>\n<div style=\"border-bottom: 1.5px solid black; margin: 10px 0;\"></div>")
            
        meta["content_html"] = html
        supabase.table("document_sections").update({"metadata": meta}).eq("id", row["id"]).execute()
        
print("Successfully patched MEMORANDUM TEMPLATE HTML in the database!")
