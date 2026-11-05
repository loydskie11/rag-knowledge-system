import sys

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
in_text_extraction = False
for line in lines:
    if 'if metadata.get("category") == "Branding Asset":' in line:
        new_lines.append("""        category = metadata.get("category", "")
        if category in ["Forms / Templates", "Branding Asset"]:
            print(f"[BG] Category '{category}' is template-only. OCR and vector indexing bypassed.")
            # Skip OCR and vector embedding entirely
            
            # Still log the audit event that it was successfully uploaded
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
            except Exception as audit_err:
                pass
            return
""")
        # We skip the next 2 lines
        continue
    elif 'extracted_text = f"[BRANDING ASSET] - Image placeholder' in line:
        continue
    else:
        new_lines.append(line)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
print("Updated process_document_background")
