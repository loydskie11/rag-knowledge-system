import sys
with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()
routes = {}
for i, line in enumerate(lines):
    if line.startswith("@app."):
        route = line.strip()
        if route in routes:
            routes[route].append(i)
        else:
            routes[route] = [i]
for route, lines in routes.items():
    if len(lines) > 1:
        print(f"{route}: {lines}")
