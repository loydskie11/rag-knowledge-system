import sqlite3
import json

try:
    conn = sqlite3.connect(r"c:\Projects\rag-governance\backend\rag_governance.db")
    c = conn.cursor()
    c.execute("SELECT content_html FROM document_chunks WHERE document_name = 'CAR Form 1 Template' LIMIT 1")
    row = c.fetchone()
    if row:
        html = row[0]
        # print the first 500 chars to see if there's a style block
        print(html[:1000])
    else:
        print("Not found")
except Exception as e:
    print(e)
