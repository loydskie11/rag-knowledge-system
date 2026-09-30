with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Show the Issue CAR button area exactly
for j in range(1336, 1350):
    print(f"{j}: {repr(lines[j])}")
