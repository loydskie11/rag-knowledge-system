import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove the backend query param
content = content.replace(
    'apiClient.get("/documents", { params: { category: "Template" } }).then(res => {',
    'apiClient.get("/documents").then(res => {'
)

# 2. Update frontend filter to include "Forms / Templates"
old_filter = """          const filtered = res.data.filter(d => 
            (d.category === "Template" || 
             d.category === "Accreditation Evidence" || 
             (d.name && d.name.toUpperCase().includes("TEMPLATE"))) &&
            d.status !== "Archived"
          );"""

new_filter = """          const filtered = res.data.filter(d => 
            (d.category === "Template" || 
             d.category === "Forms / Templates" || 
             d.category === "Accreditation Evidence" || 
             (d.name && d.name.toUpperCase().includes("TEMPLATE"))) &&
            d.status !== "Archived"
          );"""

content = content.replace(old_filter, new_filter)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched DocumentGenerator.tsx categories successfully!")
