with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

end_idx = -1
for i, line in enumerate(lines):
    if "=== ADD CAR FORM 1 MODAL" in line:
        end_idx = i
        break

for i in range(end_idx - 1, 0, -1):
    if "</div>" in lines[i]:
        print("LAST DIV BEFORE MODAL AT", i, lines[i].strip())
        break

print("Lines around end:")
print("".join(lines[end_idx-10:end_idx+2]))
