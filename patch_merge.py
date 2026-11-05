import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

old_logic = """        if not res.data:
            raise HTTPException(status_code=404, detail="Document not found")

        meta = _merge_metadata_across_chunks(res.data)"""

new_logic = """        if not res.data:
            raise HTTPException(status_code=404, detail="Document not found")

        # Parse metadata and filter out Archived chunks if Active chunks exist
        parsed_rows = []
        import json
        for r in res.data:
            meta = r.get("metadata", {})
            if isinstance(meta, str):
                try: meta = json.loads(meta)
                except: meta = {}
            r["metadata"] = meta
            parsed_rows.append(r)
            
        active_rows = [r for r in parsed_rows if r["metadata"].get("status") != "Archived"]
        target_rows = active_rows if active_rows else parsed_rows

        meta = _merge_metadata_across_chunks(target_rows)"""

content = content.replace(old_logic, new_logic)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched get_document_content to ignore archived chunks when merging.")
