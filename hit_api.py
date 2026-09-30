import requests

try:
    res = requests.get("http://localhost:8000/documents/CAR%20Form%201%20Template/content")
    print("Status:", res.status_code)
    data = res.json()
    html = data.get("content_html")
    if html:
        print("HTML length:", len(html))
        print("Starts with:", html[:100])
    else:
        print("No content_html found")
        print("Keys:", data.keys())
except Exception as e:
    print(e)
