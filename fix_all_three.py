import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# =====================================================
# FIX 1: Fix CHECKED/UNCHECKED unicode escape strings
# The Python script wrote "\u2611" as a literal 6-char escape string
# We need them to be the actual TypeScript unicode escape sequences
# =====================================================
content = content.replace(
    'const CHECKED = "\\u2611";',
    'const CHECKED = "\u2611"; // ballot box with check'
)
content = content.replace(
    'const UNCHECKED = "\\u2610";',
    'const UNCHECKED = "\u2610"; // ballot box'
)

# =====================================================
# FIX 2: Fix the "Issue CAR" button in ISO clause drawer
# It CURRENTLY also triggers confirmIsoStatusUpdate (which opens revoke modal)
# It should ONLY pre-fill the CAR form and open the Add CAR modal
# =====================================================
old_issue_car_btn = """onClick={() => {
                confirmIsoStatusUpdate && confirmIsoStatusUpdate(expandedIsoClause.id, "Not Compliant", `${expandedIsoClause.iso_clause}: ${expandedIsoClause.title}`);
                setNewCarForm((prev: any) => ({...prev, area: expandedIsoClause.auditee_office || "", iso_clause_id: expandedIsoClause.id || "", findings: `Non-conformity under ${expandedIsoClause.iso_clause}: ${expandedIsoClause.title}. ${expandedIsoClause.description || ""}`}));
                setShowAddCarModal(true);
              }}"""
new_issue_car_btn = """onClick={() => {
                setNewCarForm((prev: any) => ({...prev, area: expandedIsoClause.auditee_office || "", iso_clause_id: expandedIsoClause.id || "", findings: `Non-conformity under ${expandedIsoClause.iso_clause}: ${expandedIsoClause.title}. ${expandedIsoClause.description || ""}`}));
                setShowAddCarModal(true);
              }}"""

if old_issue_car_btn in content:
    content = content.replace(old_issue_car_btn, new_issue_car_btn)
    print("Fixed Issue CAR button (removed spurious revoke confirmation)")
else:
    print("WARNING: Issue CAR button pattern not found!")

# =====================================================
# FIX 3: Remove orange top borders from CAR modals (lines 5872, 6087, 6235, 6290)
# Keep green ones for compliant, amber for non-compliant, remove orange ones
# =====================================================
# Add CAR modal (line 5872)
content = content.replace(
    'bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230] my-8 flex flex-col max-h-[90vh]',
    'bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]'
)
# Delete Confirm CAR modal (line 6235)
content = content.replace(
    'bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230]',
    'bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden'
)
# QMS Modals (line 4659, 4740, 4842, 4965, etc.)
content = content.replace(
    'bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230]',
    'bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden'
)
content = content.replace(
    'bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-t-4 border-t-[#DD7230]',
    'bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200'
)
content = content.replace(
    'bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230]',
    'bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden'
)

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("All 3 fixes applied!")
