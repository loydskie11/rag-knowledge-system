with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i in range(1286, len(lines)):
    if "{/*" in lines[i]:
        print("COMMENT AT", i, lines[i].strip())
        break
