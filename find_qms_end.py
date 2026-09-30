with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i in range(1287, len(lines)):
    if '{/* --- MODALS --- */}' in lines[i]:
        print("MODALS AT", i)
        print("".join(lines[i-15:i+2]))
        break
