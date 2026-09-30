import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if '<th className="p-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Dept / Area Affected</th>' in line:
        new_lines.append('                            <th className="p-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">Initiator</th>\n')
    if '<td className="p-3 text-sm text-gray-700 max-w-xs truncate">{car.area || "' in line:
        new_lines.append('                              <td className="p-3 text-sm text-gray-700">{car.initiator || "—"}</td>\n')

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
print("Updated table headers and columns")
