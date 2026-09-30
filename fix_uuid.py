import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

old_create = """@app.post("/car-forms", response_model=schemas.CARFormResponse, status_code=status.HTTP_201_CREATED)
def create_car_form(
    payload: schemas.CARFormCreate,
    db: Session = Depends(get_db)
):
    new_car = models.CARForm(**payload.dict())
    db.add(new_car)
    db.commit()
    db.refresh(new_car)
    return new_car"""

new_create = """@app.post("/car-forms", response_model=schemas.CARFormResponse, status_code=status.HTTP_201_CREATED)
def create_car_form(
    payload: schemas.CARFormCreate,
    db: Session = Depends(get_db)
):
    data = payload.dict()
    # Fix for SQLAlchemy UUID casting error when frontend passes empty string
    if data.get("iso_clause_id") == "":
        data["iso_clause_id"] = None
        
    new_car = models.CARForm(**data)
    db.add(new_car)
    db.commit()
    db.refresh(new_car)
    return new_car"""

old_update = """@app.put("/car-forms/{car_id}", response_model=schemas.CARFormResponse)
def update_car_form(
    car_id: str,
    payload: schemas.CARFormUpdate,
    db: Session = Depends(get_db)
):
    car = db.query(models.CARForm).filter(models.CARForm.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="CAR Form not found")
        
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(car, key, value)
        
    db.commit()"""

new_update = """@app.put("/car-forms/{car_id}", response_model=schemas.CARFormResponse)
def update_car_form(
    car_id: str,
    payload: schemas.CARFormUpdate,
    db: Session = Depends(get_db)
):
    car = db.query(models.CARForm).filter(models.CARForm.id == car_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="CAR Form not found")
        
    update_data = payload.dict(exclude_unset=True)
    if update_data.get("iso_clause_id") == "":
        update_data["iso_clause_id"] = None
        
    for key, value in update_data.items():
        setattr(car, key, value)
        
    db.commit()"""

content = content.replace(old_create, new_create)
content = content.replace(old_update, new_update)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed empty string UUID constraint in main.py")
