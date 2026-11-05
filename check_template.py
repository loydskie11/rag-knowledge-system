import requests
r = requests.get("http://localhost:8000/documents/CAR%20Form%201%20Template/content")
print("Status:", r.status_code)
d = r.json()
print("Keys:", list(d.keys()))
html = d.get("content_html", "")
print("HTML length:", len(html))
if html:
    print("First 100:", html[:100])
