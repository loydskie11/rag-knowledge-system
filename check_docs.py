import sys
sys.path.append(r"c:\Projects\rag-governance\backend")
from database import engine
from sqlalchemy import text
import json

with engine.connect() as conn:
    res = conn.execute(text("SELECT metadata FROM document_sections;"))
    for row in res:
        m = row[0]
        if isinstance(m, str):
            m = json.loads(m)
        print(m.get("name"), "-->", m.get("file_url"))
