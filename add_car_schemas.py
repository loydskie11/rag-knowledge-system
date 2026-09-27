import sys

with open("c:/Projects/rag-governance/backend/schemas.py", "a", encoding="utf-8") as f:
    f.write("""
class CARFormCreate(BaseModel):
    cycle_year: str = "2025 Surveillance"
    car_no: Optional[str] = None
    date_issued: Optional[str] = None
    revision: Optional[str] = None
    finding_category: Optional[str] = "UNKNOWN"
    type_of_non_conformity: Optional[str] = None
    auditor_name: Optional[str] = None
    acknowledged_by: Optional[str] = None
    campus: Optional[str] = None
    area: Optional[str] = None
    findings: Optional[str] = None
    root_cause: Optional[str] = None
    immediate_action: Optional[str] = None
    corrective_measure: Optional[str] = None
    status: str = "Open"

class CARFormUpdate(BaseModel):
    car_no: Optional[str] = None
    date_issued: Optional[str] = None
    revision: Optional[str] = None
    finding_category: Optional[str] = None
    type_of_non_conformity: Optional[str] = None
    auditor_name: Optional[str] = None
    acknowledged_by: Optional[str] = None
    campus: Optional[str] = None
    area: Optional[str] = None
    findings: Optional[str] = None
    root_cause: Optional[str] = None
    immediate_action: Optional[str] = None
    corrective_measure: Optional[str] = None
    status: Optional[str] = None

class CARFormResponse(BaseModel):
    id: uuid.UUID
    cycle_year: str
    car_no: Optional[str] = None
    date_issued: Optional[str] = None
    revision: Optional[str] = None
    finding_category: Optional[str] = None
    type_of_non_conformity: Optional[str] = None
    auditor_name: Optional[str] = None
    acknowledged_by: Optional[str] = None
    campus: Optional[str] = None
    area: Optional[str] = None
    findings: Optional[str] = None
    root_cause: Optional[str] = None
    immediate_action: Optional[str] = None
    corrective_measure: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
""")
print("Added CARForm schemas to schemas.py")
