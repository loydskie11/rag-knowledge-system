import sys
sys.path.append(r"c:\Projects\rag-governance\backend")
from main import supabase

res = supabase.storage.from_("documents").list()
for file in res:
    if "car" in file["name"].lower():
        print(file["name"])
