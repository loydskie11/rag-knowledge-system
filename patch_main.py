import sys

with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = """    # Final safety net: strip any restricted chunks that slipped through
    safe_chunks = [
        chunk for chunk in relevant_chunks
        if chunk.get('metadata', {}).get('status') != 'Archived'
        and not is_non_rag_category(chunk.get('metadata', {}).get('category'))
        and chunk.get('metadata', {}).get('category') not in excluded_categories
    ]
    relevant_chunks = safe_chunks"""

new_str = """    # Final safety net: strip any restricted chunks that slipped through
    safe_chunks = []
    for chunk in relevant_chunks:
        meta = chunk.get('metadata') or {}
        if isinstance(meta, str):
            import json
            try: meta = json.loads(meta)
            except: meta = {}
            
        status = str(meta.get('status', '')).strip().lower()
        cat = str(meta.get('category', '')).strip()
        
        if status == 'archived':
            continue
        if is_non_rag_category(cat):
            continue
        if cat in excluded_categories:
            continue
            
        safe_chunks.append(chunk)

    relevant_chunks = safe_chunks"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open('backend/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully replaced.")
else:
    print("Old string not found!")
