with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re

# We will completely rewrite handleExportCarForm using python regex replacement
start_idx = content.find("const handleExportCarForm = async (car: any) => {")
end_idx = content.find("  const handleExportCarLogsheet = async () => {", start_idx)
if end_idx == -1:
    # try another function
    end_idx = content.find("  const handleExportLogsheet", start_idx)
if end_idx == -1:
    end_idx = content.find("  const handleUploadDocument", start_idx)

# If we still can't find the end, we'll just do a precise regex replace on the printWindow block
