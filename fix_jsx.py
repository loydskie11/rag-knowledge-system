import re

with open('src/app/pages/DocumentGenerator.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('{downloading === "docx" ? <RefreshCw className="h-4 w-4 animate-spin" /> : }', '{downloading === "docx" ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}')
c = c.replace('{downloading === "pdf" ? <RefreshCw className="h-4 w-4 animate-spin" /> : }', '{downloading === "pdf" ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}')

with open('src/app/pages/DocumentGenerator.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("Fixed JSX.")
