import re

with open(r"c:\Projects\rag-governance\backend\schemas.py", "r", encoding="utf-8") as f:
    content = f.read()

create_target = """    target_date: Optional[str] = None
    status: str = "Open" """
create_repl = """    target_date: Optional[str] = None
    status: str = "Open"
    follow_up_result: Optional[str] = None
    follow_up_date: Optional[str] = None
    comments_remarks: Optional[str] = None
    non_conformity_closed: Optional[bool] = False"""
content = content.replace(create_target.strip(), create_repl.strip())

update_target = """    target_date: Optional[str] = None
    status: Optional[str] = None"""
update_repl = """    target_date: Optional[str] = None
    status: Optional[str] = None
    follow_up_result: Optional[str] = None
    follow_up_date: Optional[str] = None
    comments_remarks: Optional[str] = None
    non_conformity_closed: Optional[bool] = None"""
content = content.replace(update_target, update_repl)

response_target = """    target_date: Optional[str] = None
    status: str
    created_at: datetime"""
response_repl = """    target_date: Optional[str] = None
    status: str
    follow_up_result: Optional[str] = None
    follow_up_date: Optional[str] = None
    comments_remarks: Optional[str] = None
    non_conformity_closed: Optional[bool] = False
    created_at: datetime"""
content = content.replace(response_target, response_repl)

with open(r"c:\Projects\rag-governance\backend\schemas.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated schemas.py successfully.")
