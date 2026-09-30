with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find the Add CAR modal header - look for orange border
for i, line in enumerate(lines):
    if "showAddCarModal" in line and "fixed" in line:
        print(f"line {i}: {line.strip()}")

# Find the modal header border-t-4 orange in add car modal 
for i, line in enumerate(lines):
    if "border-t-4" in line or "border-t-[#DD7230]" in line:
        print(f"line {i}: {line.strip()}")
