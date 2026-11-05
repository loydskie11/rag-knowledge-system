import sys
import os
from sqlalchemy.orm import Session
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from database import engine, SessionLocal
from models import Document
import uuid

db = SessionLocal()
try:
    with open("CAR_Form_3_Template.html", "r", encoding="utf-8") as f:
        html_content = f.read()

    existing = db.query(Document).filter(Document.title == "CAR Form 3 Template").first()
    if existing:
        existing.content_html = html_content
        print("Updated existing template")
    else:
        new_doc = Document(
            id=str(uuid.uuid4()),
            title="CAR Form 3 Template",
            doc_category="Form / Template",
            content_html=html_content
        )
        db.add(new_doc)
        print("Inserted new template")
    db.commit()
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
