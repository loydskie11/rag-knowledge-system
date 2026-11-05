import sys
import re

with open("c:/Projects/rag-governance/backend/main.py", "r", encoding="utf-8") as f:
    content = f.read()

car_endpoints = """
# -----------------------------------------------------------------------------------------------------------------------
# CAR FORMS (Form 1)
# -----------------------------------------------------------------------------------------------------------------------

@app.get("/car-forms", response_model=List[schemas.CARFormResponse])
def get_car_forms(
    cycle_year: str = Query("2025 Surveillance"),
    db: Session = Depends(get_db),
    email: str = Header(None)
):
    query = db.query(models.CARForm).filter(models.CARForm.cycle_year == cycle_year)
    return query.order_by(models.CARForm.created_at.desc()).all()


@app.post("/car-forms", response_model=schemas.CARFormResponse, status_code=status.HTTP_201_CREATED)
def create_car_form(
    payload: schemas.CARFormCreate,
    db: Session = Depends(get_db),
    email: str = Header(None)
):
    new_car = models.CARForm(**payload.dict())
    db.add(new_car)
    db.commit()
    db.refresh(new_car)
    return new_car


@app.put("/car-forms/{car_id}", response_model=schemas.CARFormResponse)
def update_car_form(
    car_id: str,
    payload: schemas.CARFormUpdate,
    db: Session = Depends(get_db),
    email: str = Header(None)
):
    car = db.query(models.CARForm).filter(models.CARForm.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="CAR Form not found")
        
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(car, key, value)
        
    db.commit()
    db.refresh(car)
    return car

@app.delete("/car-forms/{car_id}")
def delete_car_form(
    car_id: str,
    db: Session = Depends(get_db),
    email: str = Header(None)
):
    car = db.query(models.CARForm).filter(models.CARForm.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="CAR Form not found")
        
    db.delete(car)
    db.commit()
    return {"message": "CAR Form successfully deleted."}
"""

# Let's insert it right before the "CAR FORM OCR EXTRACTION" block
ocr_block = "# CAR FORM OCR EXTRACTION"
insert_idx = content.find(ocr_block)

if insert_idx != -1:
    content = content[:insert_idx] + car_endpoints + "\n" + content[insert_idx:]
    with open("c:/Projects/rag-governance/backend/main.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("Added CAR Form endpoints successfully!")
else:
    print("Could not find OCR block")
