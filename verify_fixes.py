with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Check CHECKED unicode
idx = content.find("const CHECKED =")
print("CHECKED line:", content[idx:idx+60].encode("unicode_escape").decode("ascii"))

# Check if any border-t-[#DD7230] remain in CAR modals
import re
for m in re.finditer(r'border-t-\[#DD7230\]', content):
    start = max(0, m.start()-100)
    print("Remaining:", content[start:m.end()+50].replace("\n", " "))

# Check handleExportCarForm still has correct structure
if "const a = document.createElement" in content:
    print("\nPrint: Download method present")
if "window.print()" in content:
    print("Print: window.print() present in blob")
