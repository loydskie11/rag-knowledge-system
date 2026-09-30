import sys
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i in range(2150, 2250):
    if lines[i].startswith("  };"):
        print(f"End at {i}")
        break
