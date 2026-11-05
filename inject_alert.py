import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_start = """  const handleExportCarForm = async (car: any) => {
    // Open native Print/PDF dialog synchronously to bypass browser pop-up blockers
    const printWindow = window.open("", "_blank", "width=900,height=800");"""

new_start = """  const handleExportCarForm = async (car: any) => {
    console.log("handleExportCarForm triggered for car:", car.car_no);
    
    // Open native Print/PDF dialog synchronously to bypass browser pop-up blockers
    const printWindow = window.open("", "_blank", "width=900,height=800");"""

if old_start in content:
    content = content.replace(old_start, new_start)
    with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Added console.log to start of handleExportCarForm.")
else:
    print("Could not find start of function.")
