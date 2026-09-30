import sys
import requests
import urllib.parse

url = f"http://localhost:8000/documents/{urllib.parse.quote('CAR Form 1 Template')}/content"
print(f"Requesting: {url}")
try:
    res = requests.get(url)
    print("Status:", res.status_code)
    data = res.json()
    if 'content_html' in data:
        html = data['content_html']
        if html:
            print("HTML length:", len(html))
        else:
            print("HTML is empty string")
    else:
        print("No content_html in response:", data)
except Exception as e:
    print("Request failed:", e)
