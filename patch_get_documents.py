import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

old_func = """@app.get("/documents")
def get_documents():
    try:
        res = supabase.table("document_sections").select("metadata").execute()

        unique_docs = {}
        if res.data:
            for row in res.data:
"""

new_func = """@app.get("/documents")
def get_documents(category: Optional[str] = None, status: Optional[str] = None):
    try:
        all_rows = []
        # Paginate to bypass PostgREST 1000 row limit
        for i in range(10):
            res = supabase.table("document_sections").select("metadata").order("id", desc=True).range(i*1000, (i+1)*1000 - 1).execute()
            if not res.data: break
            all_rows.extend(res.data)

        unique_docs = {}
        for row in all_rows:
"""
content = content.replace(old_func, new_func)

# Also fix the indentation of the rest of the loop
# Wait, replacing the start is safe because the indentation of `meta = row.get` is 16 spaces, which matches!
# Let's write it to a temp file and check.
with open(r"c:\Projects\rag-governance\backend\main_patch.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Patched.")
