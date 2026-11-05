with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "def _backfill_content_html" in line:
        for j in range(i, i+30):
            print(lines[j].strip().encode("ascii", "ignore").decode("ascii"))
        break
