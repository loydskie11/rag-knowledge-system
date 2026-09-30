with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('useState<"clauses" | "qms" | "car_logsheet">("clauses")', 'useState<"clauses" | "car_logsheet">("clauses")')

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Cleaned up isoSubTab type.")
