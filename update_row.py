import sys
c = open('src/app/pages/DocumentGenerator.tsx', 'r', encoding='utf-8').read()
c = c.replace('group.norm.toLowerCase().includes("recipient")', 'group.norm.toLowerCase() === "recipients" || group.norm.toLowerCase() === "recipient rows"')
open('src/app/pages/DocumentGenerator.tsx', 'w', encoding='utf-8').write(c)
