import re

with open('src/app/pages/DocumentGenerator.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace strong orange with gray-800 / gray-900
c = re.sub(r'#dd7230', '#111827', c, flags=re.IGNORECASE)
c = re.sub(r'#c45e22', '#030712', c, flags=re.IGNORECASE)
c = re.sub(r'#FFF4E5', '#F3F4F6', c, flags=re.IGNORECASE)

# Replace green with gray
c = re.sub(r'emerald-50', 'gray-50', c)
c = re.sub(r'emerald-300', 'gray-300', c)
c = re.sub(r'emerald-700', 'gray-700', c)

# Replace red with gray
c = re.sub(r'rose-500', 'gray-500', c)
c = re.sub(r'rose-50', 'gray-100', c)

with open('src/app/pages/DocumentGenerator.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print("Colors neutralized.")
