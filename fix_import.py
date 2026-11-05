import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add Printer to lucide-react imports
if "Printer" not in content[:1000]:
    content = re.sub(
        r'import \{([^\}]+)\} from "lucide-react";',
        r'import {\1, Printer} from "lucide-react";',
        content,
        count=1
    )

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Import fixed.")
