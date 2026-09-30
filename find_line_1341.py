with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Line 1341 - what triggers setShowAddCarModal there?
print("=== Around line 1341 ===")
for j in range(1330, 1360):
    print(f"{j}: {lines[j].strip()}")
