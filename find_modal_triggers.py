with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the Add CAR modal and look for area/iso_clause_id assignment
for i, line in enumerate(lines):
    if "setShowAddCarModal(true)" in line:
        print(f"line {i}: {line.strip()}")

# Find ISO clause ID assignment issue - look for confirmIsoStatusUpdate calling setShowAddCarModal
for i, line in enumerate(lines):
    if "showAddCarModal" in line and ("revoke" in line.lower() or "Not Compliant" in line or "Decline" in line):
        print(f"line {i}: {line.strip()}")

# Find if there is another trigger for Add CAR modal near ISO status update
for i, line in enumerate(lines):
    if "setShowAddCarModal" in line:
        print(f"line {i}: {line.strip()}")
