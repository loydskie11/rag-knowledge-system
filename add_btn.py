import re

with open('src/app/pages/AccreditationSupport.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

btn = """
                          <button
                            onClick={handleExportMrcForm6}
                            className="px-3 py-2 bg-white hover:bg-emerald-50/50 text-gray-700 hover:text-emerald-700 rounded-lg text-xs font-medium transition-all border border-gray-300 hover:border-emerald-500/40 shadow-2xs flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
                            title="Generate Action Plan (MRC Form 6)"
                          >
                            <Printer className="h-3.5 w-3.5 text-emerald-600" /> MRC Form 6
                          </button>"""

pattern = re.compile(r'(<Printer className="h-3\.5 w-3\.5"\s*/>\s*Export Logsheet\s*</button>)', re.DOTALL)

if 'text-emerald-600" /> MRC Form 6' not in text:
    text, count = pattern.subn(r'\1\n' + btn, text)
    print(f"Replaced {count} occurrences")
    with open('src/app/pages/AccreditationSupport.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
else:
    print("Button already exists")
