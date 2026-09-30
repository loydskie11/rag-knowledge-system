import sys

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update ISO status endpoint
target_iso = """    req.status = payload.status\n    db.commit()\n    db.refresh(req)\n    return req"""
replacement_iso = """    req.status = payload.status
    
    if payload.status == "Compliant":
        cars = db.query(models.CARForm).filter(models.CARForm.iso_clause_id == req_id).all()
        for car in cars:
            if car.status != "CLOSED":
                car.status = "CLOSED"
                
    db.commit()
    db.refresh(req)
    return req"""
content = content.replace(target_iso, replacement_iso)

# 2. Update POST /car-forms
target_car = """@app.post("/car-forms", response_model=schemas.CARFormResponse, status_code=status.HTTP_201_CREATED)\ndef create_car_form(\n    payload: schemas.CARFormCreate,\n    db: Session = Depends(get_db)\n):\n    data = payload.dict()\n    # Fix for SQLAlchemy UUID casting error when frontend passes empty string\n    if data.get("iso_clause_id") == "":\n        data["iso_clause_id"] = None\n        \n    new_car = models.CARForm(**data)"""
replacement_car = """@app.post("/car-forms", response_model=schemas.CARFormResponse, status_code=status.HTTP_201_CREATED)
def create_car_form(
    payload: schemas.CARFormCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_faculty_or_admin)
):
    data = payload.dict()
    # Fix for SQLAlchemy UUID casting error when frontend passes empty string
    if data.get("iso_clause_id") == "":
        data["iso_clause_id"] = None
        
    if not data.get("initiator"):
        data["initiator"] = current_user.full_name or current_user.email
        
    new_car = models.CARForm(**data)"""
content = content.replace(target_car, replacement_car)

# 3. Add OCR functions and logic
target_ocr_funcs = """def extract_pdf_text(contents: bytes) -> str:"""
replacement_ocr_funcs = """def is_complex_ocr_garbage(text: str) -> bool:
    text_stripped = text.strip()
    if not text_stripped: return True
    letters = sum(c.isalpha() for c in text_stripped)
    total = len(text_stripped)
    if total > 0 and (letters / total) < 0.4: return True
    lines = [l.strip() for l in text_stripped.split('\\n') if l.strip()]
    if len(lines) > 5:
        if (sum(len(l) < 15 for l in lines) / len(lines)) > 0.7: return True
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
        client = Client(host='http://localhost:11434')
        response = client.chat(model="llama3.2-vision", messages=[{"role": "user", "content": "Extract the text and describe any tables or charts.", "images": [img_str]}])
        return response['message']['content']
    except Exception as e:
        return ""

def extract_pdf_text(contents: bytes) -> str:"""
content = content.replace(target_ocr_funcs, replacement_ocr_funcs)

target_pdf_ocr = 'page_ocr = run_ocr(ocr_instance, img_array)\n            ocr_text += (page_ocr if page_ocr.strip() else page_text) + "\\n"'
replacement_pdf_ocr = 'page_ocr = run_ocr(ocr_instance, img_array)\n            if is_complex_ocr_garbage(page_ocr):\n                vision_text = extract_with_vision(img_array)\n                if vision_text.strip(): page_ocr = vision_text\n            ocr_text += (page_ocr if page_ocr.strip() else page_text) + "\\n"'
content = content.replace(target_pdf_ocr, replacement_pdf_ocr)

target_bg_ocr = 'extracted_text = run_ocr(ocr, img_array)\n        elif filename_lower.endswith'
replacement_bg_ocr = 'extracted_text = run_ocr(ocr, img_array)\n            if is_complex_ocr_garbage(extracted_text):\n                vision_text = extract_with_vision(img_array)\n                if vision_text.strip(): extracted_text = vision_text\n        elif filename_lower.endswith'
content = content.replace(target_bg_ocr, replacement_bg_ocr)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Restored lost changes to main.py")
