with open(r"c:\Projects\rag-governance\src\app\pages\LoginPage.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    if "const response = await apiClient.post(\"/login\"" in line:
        print("".join(lines[i:i+20]))
        break
