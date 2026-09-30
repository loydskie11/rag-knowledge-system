with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Look at what happens in IsoStatusModal - is it a revoke confirm?
print("=== showIsoStatusModal at line 5391 ===")
for j in range(5391, 5430):
    print(f"{j}: {lines[j].strip()}")
