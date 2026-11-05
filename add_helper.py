import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1">Department / Area</label>
                    <input type="text" value={newCarForm.area} onChange={(e) => setNewCarForm({...newCarForm, area: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                  </div>"""

replacement = """                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1">Department / Area</label>
                    <input type="text" value={newCarForm.area} onChange={(e) => setNewCarForm({...newCarForm, area: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                    <p className="text-[10px] text-gray-500 mt-1.5 leading-tight italic">
                      Note: If the scanned form area differs from the selected ISO clause office, the system will accept the form input for tracking flexibility.
                    </p>
                  </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Successfully added helper text.")
else:
    print("Target not found. Doing a fallback search.")
