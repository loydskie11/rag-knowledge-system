import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from backend.database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE car_forms ADD COLUMN initiator VARCHAR(255);"))
        conn.commit()
    print("Column added successfully.")
except Exception as e:
    print(f"Error: {e}")
