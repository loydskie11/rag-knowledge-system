import sqlite3
import uuid

conn = sqlite3.connect('backend/rag_governance.db')
cur = conn.cursor()
content = open('mrc_forms/Memo-Template.html', 'r', encoding='utf-8').read()
cur.execute("INSERT OR REPLACE INTO documents (id, title, category, content_html, status, upload_date) VALUES (?, ?, ?, ?, ?, datetime('now'))", (str(uuid.uuid4()), 'Official Memorandum Template', 'Forms / Templates', content, 'active'))
conn.commit()
print('Inserted Memo')
