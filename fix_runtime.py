import os

# Fix nginx.conf (remove BOM)
with open('nginx.conf', 'rb') as f:
    content = f.read()

if content.startswith(b'\xef\xbb\xbf'):
    content = content[3:]
    with open('nginx.conf', 'wb') as f:
        f.write(content)
    print("Removed BOM from nginx.conf")
else:
    print("No BOM found in nginx.conf, checking if it starts with something else.")
    print("Starts with:", content[:10])

# Fix backend/requirements.txt (add openai)
with open('backend/requirements.txt', 'r', encoding='utf-8') as f:
    reqs = f.read()

if 'openai' not in reqs.lower():
    reqs += '\nopenai\n'
    with open('backend/requirements.txt', 'w', encoding='utf-8') as f:
        f.write(reqs)
    print("Added openai to requirements.txt")
else:
    print("openai already in requirements.txt")
