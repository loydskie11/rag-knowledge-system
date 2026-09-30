import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
print("Context around 1031:")
for i in range(1020, 1040):
    print(f"{i}: {lines[i].strip()}")

print("\nContext around 2149:")
for i in range(2145, 2155):
    print(f"{i}: {lines[i].strip()}")
