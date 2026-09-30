import sys
import os

sys.path.append(r"c:\Projects\rag-governance\backend")
from database import supabase

res = supabase.table("document_sections").select("metadata->>name").execute()
names = set([r.get("name") for r in res.data if r.get("name")])
for name in names:
    print(name)
