import io
import asyncio
from backend.main import process_document_background

with open(r"c:\Projects\rag-governance\docGenerator\MEMO TEMPLATE.docx", "rb") as f:
    contents = f.read()

meta = {
    "name": "MEMO TEMPLATE",
    "category": "Template",
    "office": "Admin",
    "version": "1",
    "effectivity_date": "2026-01-01",
    "upload_date": "2026-01-01",
    "file_url": "dummy",
    "status": "Active",
    "uploaded_by": "admin"
}

process_document_background(
    contents=contents,
    filename="MEMO TEMPLATE.docx",
    content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    metadata=meta
)
