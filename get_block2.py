with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()
parts = content.split('const ncType = (car.type_of_non_conformity || "").toLowerCase();')
if len(parts) == 2:
    print(parts[1][:500].encode("ascii", "ignore").decode("ascii"))
