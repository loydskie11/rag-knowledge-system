import requests, urllib.parse, json

# 1. Test the template fetch
url = f"http://localhost:8000/documents/{urllib.parse.quote('CAR Form 1 Template')}/content"
res = requests.get(url)
data = res.json()
html = data.get("content_html", "")
print("Status:", res.status_code)
print("HTML length:", len(html))
print("First 200 chars:", html[:200])
