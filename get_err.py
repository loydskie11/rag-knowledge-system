with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i in range(175, 190):
    print(f"{i}: {lines[i]}")
