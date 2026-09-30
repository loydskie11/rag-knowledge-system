import sys

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

# Replace inside extract_pdf_text
content = content.replace(
    'page_ocr = run_ocr(ocr_instance, img_array)\n            ocr_text += (page_ocr if page_ocr.strip() else page_text) + "\\n"',
    'page_ocr = run_ocr(ocr_instance, img_array)\n            if is_complex_ocr_garbage(page_ocr):\n                print(f"[OCR] Page {page_num} detected as complex/garbage. Falling back to llama3.2-vision...")\n                vision_text = extract_with_vision(img_array)\n                if vision_text.strip():\n                    page_ocr = vision_text\n            ocr_text += (page_ocr if page_ocr.strip() else page_text) + "\\n"'
)

# Replace inside process_document_background
content = content.replace(
    'extracted_text = run_ocr(ocr, img_array)\n        elif filename_lower.endswith',
    'extracted_text = run_ocr(ocr, img_array)\n            if is_complex_ocr_garbage(extracted_text):\n                print(f"[OCR] Image {filename} detected as complex/garbage. Falling back to llama3.2-vision...")\n                vision_text = extract_with_vision(img_array)\n                if vision_text.strip():\n                    extracted_text = vision_text\n        elif filename_lower.endswith'
)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Replaced text")
