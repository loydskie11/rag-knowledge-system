with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

start = -1
for i, line in enumerate(lines):
    if "const handleExportCarForm = async (car: any) => {" in line:
        start = i
        break
        
if start != -1:
    end = start
    brackets = 0
    for i in range(start, len(lines)):
        brackets += lines[i].count("{") - lines[i].count("}")
        if brackets == 0:
            end = i
            break
    print("".join(lines[start:end+1]).encode("ascii", "ignore").decode("ascii"))
