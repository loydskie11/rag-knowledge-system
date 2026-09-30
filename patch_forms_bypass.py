import sys

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

target = """        # If the category is Branding Asset, skip OCR completely!
        if metadata.get("category") == "Branding Asset":
            extracted_text = f"[BRANDING ASSET] - Image placeholder for {metadata.get('name', filename)}. OCR Bypassed.\""""

replacement = """        category = metadata.get("category", "")
        if category in ["Forms / Templates", "Branding Asset"]:
            print(f"[BG] Category '{category}' is template-only. OCR and vector indexing bypassed.")
            try:
                event_type = "Document Upload"
                if is_ched_evidence: event_type = "CHED Evidence Upload"
                elif is_iso_evidence: event_type = "ISO Evidence Upload"
                
                from database import supabase
                supabase.table("system_events_logs").insert({
                    "user_email": metadata.get("uploaded_by", "system"),
                    "event_type": event_type,
                    "description": f"File '{metadata.get('name', filename)}' uploaded successfully (AI indexing bypassed for {category})."
                }).execute()
            except Exception:
                pass
            return"""

# Only replace the FIRST occurrence which is in process_document_background
content = content.replace(target, replacement, 1)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Forms / Templates bypass added!")
