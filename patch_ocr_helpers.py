import sys

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if line.startswith("def extract_pdf_text("):
        new_lines.append("""
def is_complex_ocr_garbage(text: str) -> bool:
    \"\"\"Heuristic to detect if PaddleOCR output is garbage or a complex table.\"\"\"
    text_stripped = text.strip()
    if not text_stripped:
        return True # Completely failed to read it, fallback!
    
    # If the text has a huge number of numbers/symbols compared to letters
    letters = sum(c.isalpha() for c in text_stripped)
    total = len(text_stripped)
    if total > 0 and (letters / total) < 0.4:
        return True
    
    # If there are many very short lines (disconnected boxes in a flowchart)
    lines = [l.strip() for l in text_stripped.split('\\n') if l.strip()]
    if len(lines) > 5:
        short_lines = sum(len(l) < 15 for l in lines)
        if (short_lines / len(lines)) > 0.7:
            return True
            
    return False

def extract_with_vision(img_array) -> str:
    import base64
    from io import BytesIO
    from PIL import Image
    
    try:
        img = Image.fromarray(img_array)
        buffered = BytesIO()
        img.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        from ollama import Client
        import os
        
        # Connect to Ollama
        client = Client(host='http://localhost:11434')
        response = client.chat(
            model="llama3.2-vision",
            messages=[
                {
                    "role": "user",
                    "content": "This is a scanned page from an institutional document. It may contain a complex table, chart, or flowchart. Please extract all the text and describe any tables or charts clearly in markdown format.",
                    "images": [img_str]
                }
            ]
        )
        return response['message']['content']
    except Exception as e:
        print(f"Vision fallback failed: {e}")
        return ""
""")
    new_lines.append(line)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
print("Added helper functions")
