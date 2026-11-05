import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

old_code = """        contents = await file.read()
        filename_lower = file.filename.lower()
        raw_text = ""

        # If the category is Branding Asset, skip OCR completely!
        if metadata.get("category") == "Branding Asset":
            extracted_text = f"[BRANDING ASSET] - Image placeholder for {metadata.get('name', filename)}. OCR Bypassed."
        elif filename_lower.endswith(".pdf"):
            raw_text = extract_pdf_text(contents)"""

new_code = """        contents = await file.read()
        filename_lower = file.filename.lower()
        raw_text = ""

        if filename_lower.endswith(".pdf"):
            raw_text = extract_pdf_text(contents)"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed extract_car_form")
else:
    print("Could not find the exact old code block. Here is a snippet of the file:")
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if "extract_car_form" in line:
            print(f"Line {i}: {line}")
            for j in range(15):
                print(f"Line {i+j+1}: {lines[i+j+1]}")
            break
