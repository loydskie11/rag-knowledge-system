import sys
sys.path.append(r"c:\Projects\rag-governance\backend")
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    queries = [
        "ALTER TABLE car_forms ADD COLUMN follow_up_result VARCHAR(255);",
        "ALTER TABLE car_forms ADD COLUMN follow_up_date VARCHAR(50);",
        "ALTER TABLE car_forms ADD COLUMN comments_remarks TEXT;",
        "ALTER TABLE car_forms ADD COLUMN non_conformity_closed BOOLEAN DEFAULT FALSE;"
    ]
    for q in queries:
        try:
            conn.execute(text(q))
            conn.commit()
            print(f"Executed: {q}")
        except Exception as e:
            print(f"Skipped (likely exists): {e}")

