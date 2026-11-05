import requests, json

# 2. Test creating a CAR form
payload = {
    "car_no": "TEST-001",
    "campus": "Argao Campus",
    "date_issued": "2026-09-30",
    "area": "Test Area",
    "auditor_name": "Test Auditor",
    "acknowledged_by": "Test Person",
    "findings": "Test finding",
    "finding_category": "MINOR",
    "type_of_non_conformity": "QMS Related",
    "immediate_action": "Test action",
    "root_cause": "Test root cause",
    "corrective_measure": "Test measure",
    "measures_proposed_by": "Test Person",
    "target_date": "2026-10-15",
    "cycle_year": "2026",
    "iso_clause_id": None,
    "status": "Open"
}
res = requests.post("http://localhost:8000/car-forms", json=payload)
print("Status:", res.status_code)
print("Response:", res.text[:500])
