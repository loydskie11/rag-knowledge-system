import sys
with open(r"c:\Projects\rag-governance\backend\schemas.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if "auditor_name: Optional[str] = None" in line:
        new_lines.append("    initiator: Optional[str] = None\n")

with open(r"c:\Projects\rag-governance\backend\schemas.py", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
print("Updated schemas.py")
