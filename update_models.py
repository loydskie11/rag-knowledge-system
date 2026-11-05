import re

with open(r"c:\Projects\rag-governance\backend\models.py", "r", encoding="utf-8") as f:
    content = f.read()

old_model = """    target_date = Column(String(50), nullable=True)
    status = Column(String(50), default="Open")"""

new_model = """    target_date = Column(String(50), nullable=True)
    status = Column(String(50), default="Open")
    follow_up_result = Column(String(255), nullable=True)
    follow_up_date = Column(String(50), nullable=True)
    comments_remarks = Column(Text, nullable=True)
    non_conformity_closed = Column(Boolean, default=False)"""

if old_model in content:
    content = content.replace(old_model, new_model)
    with open(r"c:\Projects\rag-governance\backend\models.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated models.py successfully.")
else:
    print("Failed to find replacement target in models.py")
