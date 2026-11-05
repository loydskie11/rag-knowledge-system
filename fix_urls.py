import sys

with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('`/api/car-forms?cycle_year=${encodeURIComponent(cycleYear)}`', '`/car-forms?cycle_year=${encodeURIComponent(cycleYear)}`')
content = content.replace('"/api/car-forms"', '"/car-forms"')
content = content.replace('`/api/car-forms/${editingCarForm.id}`', '`/car-forms/${editingCarForm.id}`')
content = content.replace('`/api/car-forms/${carFormToDelete.id}`', '`/car-forms/${carFormToDelete.id}`')

with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed CAR API URLs in frontend")
