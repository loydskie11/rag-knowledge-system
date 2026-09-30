with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the handleAddCarForm submit handler
for i, line in enumerate(lines):
    if "handleAddCarForm" in line or "handleCreateCarForm" in line or "handleSubmitCarForm" in line or "handleIssueCar" in line:
        print(f"line {i}: {line.strip()}")

# Find what is called on form submit in the Add CAR modal
for i, line in enumerate(lines):
    if "onSubmit" in line and "car" in line.lower():
        print(f"line {i}: {line.strip()}")
