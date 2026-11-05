import os

with open('backend/requirements.txt', 'rb') as f:
    content = f.read()

# detect encoding
if content.startswith(b'\xff\xfe'):
    reqs = content.decode('utf-16-le')
elif content.startswith(b'\xfe\xff'):
    reqs = content.decode('utf-16-be')
elif content.startswith(b'\xef\xbb\xbf'):
    reqs = content.decode('utf-8-sig')
else:
    reqs = content.decode('utf-8', errors='ignore')

if 'openai' not in reqs.lower():
    reqs += '\nopenai\n'
    # Save it back as utf-8 without BOM so Docker linux doesn't get confused
    with open('backend/requirements.txt', 'w', encoding='utf-8') as f:
        f.write(reqs)
    print("Added openai and converted requirements.txt to clean UTF-8")
else:
    # still save it as clean utf-8 just in case
    with open('backend/requirements.txt', 'w', encoding='utf-8') as f:
        f.write(reqs)
    print("openai already in there, converted to clean UTF-8")
