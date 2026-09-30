import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the filter to remove Accreditation Evidence
old_filter = """          const filtered = res.data.filter(d => 
            (d.category === "Template" || d.category === "Forms / Templates" || 
            d.category === "Accreditation Evidence" || 
            (d.name && d.name.toUpperCase().includes("TEMPLATE"))) && d.status !== "Archived"
          );"""

new_filter = """          const filtered = res.data.filter(d => 
            (d.category === "Template" || 
             d.category === "Forms / Templates" || 
             (d.name && d.name.toUpperCase().includes("TEMPLATE"))) && 
            d.status !== "Archived"
          );"""

content = content.replace(old_filter, new_filter)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Removed Accreditation Evidence from DocumentGenerator filter.")
