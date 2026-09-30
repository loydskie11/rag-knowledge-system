import urllib.request
import json

try:
    req = urllib.request.Request("http://127.0.0.1:8000/documents/MEMORANDUM%20TEMPLATE/content")
    with urllib.request.urlopen(req, timeout=5) as response:
        data = json.loads(response.read().decode())
        html = data.get("content_html", "")
        print(f"content_html length: {len(html)}")
        print(f"Sample: {html[:200]}")
except Exception as e:
    print(f"Error: {e}")
