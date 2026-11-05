import sys

with open("c:/Projects/rag-governance/src/app/pages/SignUpPage.tsx", "r", encoding="utf-8") as f:
    content = f.read()

index = content.find("}function PasswordRequirement")
if index != -1:
    content = content[:index+1]
    with open("c:/Projects/rag-governance/src/app/pages/SignUpPage.tsx", "w", encoding="utf-8") as f:
        f.write(content)
        
    print("Fixed corrupted end of file")
else:
    print("Not found")
