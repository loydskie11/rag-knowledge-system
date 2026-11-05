import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# The "Draft with AI" block starts here:
#   return (
#     <div className="space-y-6">
#       <div className="flex items-center gap-3">
#         <button
#           onClick={() => setView("chooser")}

match_start = content.find('  return (\n    <div className="space-y-6">\n      <div className="flex items-center gap-3">\n        <button\n          onClick={() => setView("chooser")}')

if match_start == -1:
    # Let's do a wider search
    match_start = content.find('  return (\n    <div className="space-y-6">')

print("Found match_start:", match_start)

if match_start != -1:
    # Find where the DocumentGenerator component ends. 
    # Usually it's right before `function ImageUploadField`
    match_end = content.find('\n}\n\nfunction ImageUploadField', match_start)
    if match_end == -1:
        match_end = content.find('\n}\n\n/* =', match_start)
        
    print("Found match_end:", match_end)
