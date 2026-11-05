with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "def extract_car_form" in line:
        print("".join(lines[i+30:i+100]))
        break
