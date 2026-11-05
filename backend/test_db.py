
from database import SessionLocal
import models
db = SessionLocal()
evs = db.query(models.QMSEvidence).all()
for e in evs:
    print(e.id, e.document_name)
    db.delete(e)
db.commit()
print("Deleted all.")

