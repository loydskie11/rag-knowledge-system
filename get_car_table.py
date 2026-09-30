with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "isoSubTab === \"car_logsheet\"" in line:
        for j in range(i, i+150):
            if "<button onClick={() => handleExportCarForm(car)}" in lines[j]:
                print(f"Found handleExportCarForm at {j}")
            if "handleExportCarLogsheet" in lines[j] or "handleExportLogsheet" in lines[j]:
                print(f"Found logsheet export at {j}: {lines[j].strip()}")
