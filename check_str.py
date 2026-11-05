import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

print("AppView found:", 'type AppView = ' in content)
print("if (view === 'chooser') found:", 'if (view === "chooser") {' in content)
print("if (view === 'templates') found:", 'if (view === "templates") {' in content)
print("if (view === 'editor') found:", 'if (view === "editor") {' in content)
print("function ChooserScreen found:", 'function ChooserScreen(' in content)
print("function TemplatesScreen found:", 'function TemplatesScreen(' in content)
print("Composer return found:", 'return (\n      <div className="space-y-6">\n        <div className="flex items-center gap-3">' in content)
