with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

print("chooser found:", content.find('if (view === "chooser") {'))
print("templates found:", content.find('if (view === "templates") {'))
