import json
from supabase import create_client
import re

url = "https://rcnmrjjuhrbluhxomnzv.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbm1yamp1aHJibHVoeG9tbnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjM5MDM0OSwiZXhwIjoyMDkxOTY2MzQ5fQ.iZId04aGPBVSk6GK7AUInTB7YlNviKeEsjncGpUjVpY"
supabase = create_client(url, key)

res = supabase.table("document_sections").select("metadata").eq("metadata->>name", "MEMO TEMPLATE").execute()
if res.data:
    meta = res.data[0].get("metadata")
    if isinstance(meta, str):
        meta = json.loads(meta)
    html = meta.get("content_html", "")
    
    # Let's print the table HTML
    table_start = html.find("<table")
    table_end = html.find("</table>") + 8
    if table_start != -1:
        print("TABLE HTML:")
        print(html[table_start:table_end])
    else:
        print("No table found")
else:
    print("Not found")
