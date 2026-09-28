import requests

url = "http://localhost:8000/upload-document"
files = {'file': ('MEMO TEMPLATE.docx', open(r'c:\Projects\rag-governance\docGenerator\MEMO TEMPLATE.docx', 'rb'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
data = {
    'name': 'MEMO TEMPLATE',
    'category': 'Template',
    'office': 'Admin',
    'version': '1',
    'effectivity_date': '2026-01-01',
    'uploaded_by': 'admin@ctu.edu.ph'
}
r = requests.post(url, files=files, data=data)
print(r.status_code)
print(r.text)
