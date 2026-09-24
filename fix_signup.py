import sys
with open("c:/Projects/rag-governance/src/app/pages/SignUpPage.tsx", "r", encoding="utf-8") as f:
    content = f.read()
# find the last "}" and remove everything after it
last_brace = content.rfind("}")
if last_brace != -1:
    content = content[:last_brace+1]
with open("c:/Projects/rag-governance/src/app/pages/SignUpPage.tsx", "w", encoding="utf-8") as f:
    f.write(content)
