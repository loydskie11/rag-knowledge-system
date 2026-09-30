with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "\"[CHECK_MAJOR]\":" in line:
        print("".join(lines[i-2:i+5]))
        break
