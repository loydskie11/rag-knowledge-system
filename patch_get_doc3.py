with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if line.startswith('@app.get("/documents")'):
        start_idx = i
    if start_idx != -1 and line.startswith('    except Exception as e:'):
        end_idx = i + 1
        break

if start_idx != -1 and end_idx != -1:
    new_func = """@app.get("/documents")
def get_documents(category: Optional[str] = None, status: Optional[str] = None):
    try:
        all_rows = []
        for i in range(10):
            res = supabase.table("document_sections").select("metadata").order("id", desc=True).range(i*1000, (i+1)*1000 - 1).execute()
            if not res.data: break
            all_rows.extend(res.data)

        unique_docs = {}
        for row in all_rows:
            meta = row.get("metadata", {})
            if isinstance(meta, str):
                try:    meta = json.loads(meta)
                except: meta = {}

            name = meta.get("name")
            if not name or name in unique_docs:
                continue

            if category and meta.get("category") != category: continue
            if status and meta.get("status") != status: continue

            unique_docs[name] = {
                "id":               meta.get("id") or f"doc_{len(unique_docs) + 1}",
                "name":             name,
                "category":         meta.get("category",         ""),
                "office":           meta.get("office",           ""),
                "program":          meta.get("program",          "GLOBAL"),
                "version":          meta.get("version",          "1.0"),
                "effectivity_date": meta.get("effectivity_date", ""),
                "status":           meta.get("status",           "Active"),
                "file_url":         meta.get("file_url",         ""),
                "upload_date":      meta.get("upload_date",      ""),
                "uploaded_by":      meta.get("uploaded_by",      "Unknown"),
            }
        return list(unique_docs.values())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
"""
    lines[start_idx:end_idx+1] = [new_func]
    with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Replaced!")
else:
    print("Not found.")
