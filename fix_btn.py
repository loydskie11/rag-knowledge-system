import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_td = """                                <td className="p-3">
                                  <div className="flex gap-1">
                                    <button onClick={() => { setEditingCarForm(car); setShowEditCarModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer" title="Edit">
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => { setCarFormToDelete(car); setShowDeleteCarModal(true); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg cursor-pointer" title="Delete">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>"""

new_td = """                                <td className="p-3">
                                  <div className="flex gap-1">
                                    <button onClick={() => handleExportCarForm(car)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors cursor-pointer" title="Generate Official CAR Form 1 (Print / PDF)">
                                      <Printer className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => { setEditingCarForm(car); setShowEditCarModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer" title="Edit">
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => { setCarFormToDelete(car); setShowDeleteCarModal(true); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg cursor-pointer" title="Delete">
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>"""

content = content.replace(old_td, new_td)

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Export button added to the table.")
