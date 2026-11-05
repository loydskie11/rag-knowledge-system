with open('old_file.tsx', 'r', encoding='utf-16') as f:
    lines = f.readlines()
start = -1
end = -1
braces = 0
for i, line in enumerate(lines):
    if '{isoSubTab === "qms"' in line:
        start = i
        braces = 1
        continue
    if start != -1:
        braces += line.count('{') - line.count('}')
        if braces <= 0:
            end = i
            break
print('start:', start, 'end:', end)
with open('qms_block.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines[start:end+1])
