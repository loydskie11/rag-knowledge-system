import re

with open('src/app/pages/AccreditationSupport.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

btn = """
                          <button
                            onClick={() => setShowAddQmsModal(true)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
                            title="Create New QMS Action Plan"
                          >
                            <Plus className="h-3.5 w-3.5" /> Create Action Plan
                          </button>"""

pattern = re.compile(r'(<Printer className="h-3\.5 w-3\.5 text-emerald-600" /> MRC Form 6\s*</button>)', re.DOTALL)

if 'Create Action Plan' not in text:
    text, count = pattern.subn(r'\1\n' + btn, text)
    print(f"Replaced {count} occurrences")
    with open('src/app/pages/AccreditationSupport.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
else:
    print("Button already exists")
