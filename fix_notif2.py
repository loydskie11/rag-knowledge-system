import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("List[schemas.NotificationOut]", "List[NotificationOut]")

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Reverted to List[NotificationOut].")
