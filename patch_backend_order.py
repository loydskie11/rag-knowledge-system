import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

old_query = """.select("metadata, id")
            .eq("metadata->>name", document_name)
            .order("id", desc=False)
            .execute()"""

new_query = """.select("metadata, id")
            .eq("metadata->>name", document_name)
            .order("id", desc=True)
            .execute()"""

if old_query in content:
    content = content.replace(old_query, new_query)
    with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched main.py order logic successfully!")
else:
    print("Could not find the query block in main.py")
