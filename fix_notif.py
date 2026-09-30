import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

broken_notif = """@app.get("/notifications"(email: str, filter: str = "all", db: Session = Depends(get_db)):"""
fixed_notif = """@app.get("/notifications", response_model=List[schemas.NotificationOut])
def get_notifications(email: str, filter: str = "all", db: Session = Depends(get_db)):"""

content = content.replace(broken_notif, fixed_notif)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed notifications syntax.")
