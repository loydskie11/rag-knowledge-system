import sys
sys.path.append(r"c:\Projects\rag-governance\backend")
from main import supabase

res = supabase.table("document_sections").select("metadata").execute()
names = set()
for r in res.data:
    meta = r.get("metadata", {})
    if isinstance(meta, dict):
        if "name" in meta:
            names.add(meta["name"])
        elif "title" in meta:
            names.add(meta["title"])

for name in names:
    print(name)
