with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "const handleExportCarForm =" in line:
        for j in range(i, i+100):
            if "catch (error: any)" in lines[j]:
                print(f"Ends at {j}")
                break
        break
