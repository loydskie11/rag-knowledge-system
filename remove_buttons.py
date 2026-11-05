import re

with open('src/app/pages/AccreditationSupport.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# First button (around line 945)
# <button
#   onClick={() => {
#     setSelectedMrcFormType("form4");
#     setShowMrcExportModal(true);
#   }}
#   className="px-3 py-2 bg-white hover:bg-orange-50/50 text-gray-700 hover:text-[#DD7230] rounded-lg text-xs font-medium transition-all border border-gray-300 hover:border-[#DD7230]/40 shadow-2xs flex items-center gap-1.5 cursor-pointer"
#   title="Export Official MRC Forms (Form 4, Form 5, Form 7, Form 2)"
# >
#   <Printer className="h-3.5 w-3.5 text-[#DD7230]" /> Export MRC Forms
# </button>
pattern1 = re.compile(r'<\s*button[^>]*?onClick=\{\(\)\s*=>\s*\{\s*setSelectedMrcFormType\("form4"\);\s*setShowMrcExportModal\(true\);\s*\}\}[^>]*?>.*?Export MRC Forms\s*</button>', re.DOTALL)
text = pattern1.sub('', text)

# Second button (around line 1034)
# <button
#   onClick={() => {
#     setSelectedMrcFormType("form4");
#     setShowMrcExportModal(true);
#   }}
#   className="... w-full sm:w-auto justify-center"
#   title="Export Official MRC Forms (Form 4, Form 5, Form 7, Form 2)"
# >
#   <FileText className="h-3.5 w-3.5 text-[#DD7230]" /> MRC Forms
# </button>
pattern2 = re.compile(r'<\s*button[^>]*?onClick=\{\(\)\s*=>\s*\{\s*setSelectedMrcFormType\("form4"\);\s*setShowMrcExportModal\(true\);\s*\}\}[^>]*?>.*?MRC Forms\s*</button>', re.DOTALL)
text = pattern2.sub('', text)

with open('src/app/pages/AccreditationSupport.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Removed buttons")
