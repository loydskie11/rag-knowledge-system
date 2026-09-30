with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
open_brackets = 1
for i in range(1288, len(lines)):
    line = lines[i]
    open_brackets += line.count("(")
    open_brackets -= line.count(")")
    if open_brackets <= 0:
        print("END OF TERNARY AT", i)
        print("".join(lines[i-5:i+5]))
        break
