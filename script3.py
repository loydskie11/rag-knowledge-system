with open('qms_block2.tsx', 'r', encoding='utf-8') as f:
    qms_code = f.read()
with open('src/app/pages/AccreditationSupport.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Insert before '    </>'
# Find the exact line in IsoTabContent.
# We'll search for the last occurrence of '</>' before 'export const ResultsTabContent ='
idx = text.find('export const ResultsTabContent =')
part1 = text[:idx]
part2 = text[idx:]

idx2 = part1.rfind('    </>')
if idx2 != -1:
    new_part1 = part1[:idx2] + qms_code + '\n' + part1[idx2:]
    with open('src/app/pages/AccreditationSupport.tsx', 'w', encoding='utf-8') as f:
        f.write(new_part1 + part2)
    print("Success")
else:
    print("Failed to find insertion point")
