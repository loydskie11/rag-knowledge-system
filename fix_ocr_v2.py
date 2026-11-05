import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the image extraction logic to be even more aggressive (DPI 72, max 600px)
old_img_logic = """        # Convert PDF page 1 or image directly to base64 JPEG
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

new_img_logic = """        # Convert PDF page 1 or image directly to base64 JPEG
        if filename_lower.endswith(".pdf"):
            import fitz
            doc = fitz.open(stream=contents, filetype="pdf")
            page = doc.load_page(0)
            # Reduced DPI to 72 for absolute minimum token context
            pix = page.get_pixmap(dpi=72)
            img_data = pix.tobytes("jpeg")
            base64_image = base64.b64encode(img_data).decode("utf-8")
            doc.close()
        elif filename_lower.endswith((".png", ".jpg", ".jpeg")):
            # Resize image to max 640px to ensure VRAM compliance
            import io
            from PIL import Image as PILImage
            img = PILImage.open(io.BytesIO(contents)).convert("RGB")
            img.thumbnail((640, 640))
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=80)
            base64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")"""

content = content.replace(old_img_logic, new_img_logic)


# 2. Update the prompt to include the checkmark/slash requirement
old_prompt = """Focus entirely on the top headers and checkboxes. For checkboxes (MAJOR, MINOR, OBSERVATION, QMS Related, etc.), visually look for an 'X' or checkmark."""
new_prompt = """Focus entirely on the top headers and checkboxes. For checkboxes (MAJOR, MINOR, OBSERVATION, QMS Related, etc.), visually look for a slash ('/'), a standard checkmark, or an 'X'. Many users will simply draw a diagonal slash mark ('/') to select the box."""

content = content.replace(old_prompt, new_prompt)

# 3. Add max_tokens=200 to speed up inference termination
old_call = """        response = local_ai_client.chat.completions.create(
            model="llama3.2-vision",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": f"{system_prompt}\\n\\nPlease extract the data from this CAR form image into the requested JSON format."
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ]
                }
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )"""

new_call = """        response = local_ai_client.chat.completions.create(
            model="llama3.2-vision",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": f"{system_prompt}\\n\\nPlease extract the data from this CAR form image into the requested JSON format."
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ]
                }
            ],
            temperature=0.0,
            max_tokens=250,
            response_format={"type": "json_object"}
        )"""

content = content.replace(old_call, new_call)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated OCR prompt, reduced image tokens, and added max_tokens!")
