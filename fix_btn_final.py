import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """                                <td className="p-3">
                                  <div className="flex gap-1">
                                    <button onClick={() => { setEditingCarForm(car); setShowEditCarModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer" title="Edit">"""

replacement = """                                <td className="p-3">
                                  <div className="flex gap-1">
                                    <button onClick={() => handleExportCarForm(car)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer" title="Generate Official CAR Form 1 (Print / PDF)">
                                      <Printer className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => { setEditingCarForm(car); setShowEditCarModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer" title="Edit">"""

if target in content:
    content = content.replace(target, replacement)
    print("Successfully replaced!")
else:
    print("Target not found. Let's try flexible matching.")
    # flexible matching if needed
    
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)

