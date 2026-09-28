import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

# We need to change process_document_background to handle Branding Asset.
# Let's find process_document_background
old_func_start = '        if filename_lower.endswith(".pdf"):'

new_func = """        # If the category is Branding Asset, skip OCR completely!
        if metadata.get("category") == "Branding Asset":
            extracted_text = f"[BRANDING ASSET] - Image placeholder for {metadata.get('name', filename)}. OCR Bypassed."
        elif filename_lower.endswith(".pdf"):"""

content = content.replace(old_func_start, new_func)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched main.py successfully!")
