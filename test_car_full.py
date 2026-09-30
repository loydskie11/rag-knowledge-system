import requests, json

# Try creating with only required fields to find what's failing
payload = {
    "car_no": "TEST-002",
    "campus": "Argao Campus",
    "date_issued": "2026-09-30",
    "area": "Admin",
    "auditor_name": "Test",
    "acknowledged_by": "Test",
    "findings": "Test finding",
    "finding_category": "MINOR",
    "type_of_non_conformity": "QMS Related",
    "immediate_action": "Test",
    "root_cause": "Test",
    "corrective_measure": "Test",
    "measures_proposed_by": "Test",
    "target_date": "2026-10-15",
    "cycle_year": "2026",
    "iso_clause_id": "",
    "status": "Open",
    "revision": "",
    "follow_up_result": "",
    "follow_up_date": "",
    "comments_remarks": "",
    "non_conformity_closed": False
}
res = requests.post("http://localhost:8000/car-forms", json=payload)
print("Status:", res.status_code)
print("Response:", res.text[:500])
