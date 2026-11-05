import requests, json

# Test 1: No ISO clause (empty string from frontend)
payload = {
    "car_no": "VERIFY-001",
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
    "iso_clause_id": "",   # <-- empty string as sent by frontend from CAR Logsheet button
    "status": "Open",
    "revision": "",
    "follow_up_result": "",
    "follow_up_date": "",
    "comments_remarks": "",
    "non_conformity_closed": False
}
res = requests.post("http://localhost:8000/car-forms", json=payload)
print("Test 1 (empty iso_clause_id):", res.status_code)
if res.status_code == 201:
    data = res.json()
    print("  iso_clause_id in response:", data.get("iso_clause_id"))
    print("  SUCCESS! CAR created, id:", data.get("id"))
else:
    print("  ERROR:", res.text[:300])

# Test 2: With a real ISO clause ID
payload2 = dict(payload)
payload2["car_no"] = "VERIFY-002"
payload2["iso_clause_id"] = "e0000004-0000-0000-0000-000000000001"
res2 = requests.post("http://localhost:8000/car-forms", json=payload2)
print("Test 2 (with iso_clause_id UUID):", res2.status_code)
if res2.status_code == 201:
    data2 = res2.json()
    print("  iso_clause_id in response:", data2.get("iso_clause_id"))
    print("  SUCCESS!")
else:
    print("  ERROR:", res2.text[:300])
