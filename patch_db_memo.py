import json
from supabase import create_client

url = "https://rcnmrjjuhrbluhxomnzv.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbm1yamp1aHJibHVoeG9tbnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM5MDM0OSwiZXhwIjoyMDkxOTY2MzQ5fQ.iZId04aGPBVSk6GK7AUInTB7YlNviKeEsjncGpUjVpY"
supabase = create_client(url, key)

res = supabase.table("document_sections").select("*").eq("metadata->>name", "MEMO TEMPLATE").execute()
if res.data:
    row = res.data[0]
    meta = row.get("metadata")
    if isinstance(meta, str):
        meta = json.loads(meta)
    
    html = meta.get("content_html", "")
    
    # Fix the table explicitly by adding inline styles to the td elements
    # original table: <table><tr><td>FROM</td><td>:</td><td><strong>[Insert Sender Name]</strong></td></tr>...
    new_html = html.replace('<td>FROM</td>', '<td style="width: 15%; white-space: nowrap; vertical-align: top;">FROM</td>')
    new_html = new_html.replace('<td>:</td>', '<td style="width: 3%; text-align: center; vertical-align: top;">:</td>')
    new_html = new_html.replace('<td><strong>[Insert Sender Name]</strong></td>', '<td style="width: 82%; vertical-align: top;"><strong>[Insert Sender Name]</strong></td>')
    new_html = new_html.replace('<tr><td></td><td></td><td>[Insert Sender Title]</td></tr>', '<tr><td style="vertical-align: top;"></td><td style="vertical-align: top;"></td><td style="vertical-align: top;">[Insert Sender Title]</td></tr>')
    
    # Also add TO if it exists
    new_html = new_html.replace('<td>TO:</td>', '<td style="width: 15%; white-space: nowrap; vertical-align: top;">TO:</td>')

    meta["content_html"] = new_html
    
    supabase.table("document_sections").update({"metadata": meta}).eq("id", row["id"]).execute()
    print("Patched MEMO TEMPLATE in database successfully!")
else:
    print("Not found")
