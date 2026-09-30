import sys
import os

sys.path.append(r"c:\Projects\rag-governance\backend")
from database import SessionLocal
from models import Document

db = SessionLocal()
docs = db.query(Document).all()
for doc in docs:
    print(doc.title)
db.close()
