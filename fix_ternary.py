import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# The pattern starts from `) : (` when preceded by the end of clauses tab (div>div>div).
# We look for the exact comment `/* --- QMS ACTION PLANS TAB CONTENT --- */` and delete until the modals section starts or the main div ends.
# A safer approach is to locate the `isoSubTab === "clauses" ? (` and change it to `isoSubTab === "clauses" && (`
content = content.replace('{isoSubTab === "clauses" ? (', '{isoSubTab === "clauses" && (')

# Then we find `) : (` right before `/* --- QMS ACTION PLANS TAB CONTENT --- */`
pattern = r'\)\s*:\s*\(\s*/\*\s*---\s*QMS ACTION PLANS TAB CONTENT\s*---\s*\*/.*?\{/\*\s*===\s*ISSUE CAR FORM 1 MODAL\s*===\s*\*/\}'
replacement = r')}\n\n      {/* === ISSUE CAR FORM 1 MODAL === */}'

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Removed QMS Action Plans tab content and fixed ternary logic.")
