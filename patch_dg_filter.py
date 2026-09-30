import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_filter_logic = """        if (active && Array.isArray(res.data)) {
          const filtered = res.data.filter(d => 
            d.category === "Template" || 
            d.category === "Accreditation Evidence" || 
            (d.name && d.name.toUpperCase().includes("TEMPLATE"))
          );
          setTemplates(filtered);
        }"""

new_filter_logic = """        if (active && Array.isArray(res.data)) {
          const filtered = res.data.filter(d => 
            (d.category === "Template" || 
             d.category === "Accreditation Evidence" || 
             (d.name && d.name.toUpperCase().includes("TEMPLATE"))) &&
            d.status !== "Archived"
          );
          setTemplates(filtered);
        }"""

if old_filter_logic in content:
    content = content.replace(old_filter_logic, new_filter_logic)
    with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched DocumentGenerator.tsx filter successfully!")
else:
    print("Could not find filter logic in DocumentGenerator.tsx")
