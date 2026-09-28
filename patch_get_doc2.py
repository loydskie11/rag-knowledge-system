import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

pattern = re.compile(r'@app\.get\("/documents"\)\ndef get_documents\(\):.*?return list\(unique_docs\.values\(\)\)\n        return \[\]\n    except Exception as e:\n        raise HTTPException\(status_code=500, detail=str\(e\)\)', re.DOTALL)

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

            # Apply filters if provided (like what server.js used to proxy)
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
        raise HTTPException(status_code=500, detail=str(e))"""

content = pattern.sub(new_func, content)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Replaced get_documents completely.")
