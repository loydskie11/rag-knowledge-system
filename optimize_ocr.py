import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

old_logic = """        # Convert PDF page 1 or image directly to base64 JPEG
        if filename_lower.endswith(".pdf"):
            import fitz
            doc = fitz.open(stream=contents, filetype="pdf")
            page = doc.load_page(0)
            pix = page.get_pixmap(dpi=150)
            img_data = pix.tobytes("jpeg")
            base64_image = base64.b64encode(img_data).decode("utf-8")
            doc.close()
        elif filename_lower.endswith((".png", ".jpg", ".jpeg")):
            base64_image = base64.b64encode(contents).decode("utf-8")"""

new_logic = """        # Convert PDF page 1 or image directly to base64 JPEG
        if filename_lower.endswith(".pdf"):
            import fitz
            doc = fitz.open(stream=contents, filetype="pdf")
            page = doc.load_page(0)
            # Reduced DPI from 150 to 90 to drastically reduce VRAM usage for Llama 3.2 Vision
            pix = page.get_pixmap(dpi=90)
            img_data = pix.tobytes("jpeg")
            base64_image = base64.b64encode(img_data).decode("utf-8")
            doc.close()
        elif filename_lower.endswith((".png", ".jpg", ".jpeg")):
            # Resize image to max 800px to prevent VRAM CPU offloading
            import io
            from PIL import Image as PILImage
            img = PILImage.open(io.BytesIO(contents)).convert("RGB")
            img.thumbnail((800, 800))
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=85)
            base64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("Optimization applied!")
else:
    print("Could not find the target code to replace.")
