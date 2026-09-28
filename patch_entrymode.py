import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. honourAiPageTarget
content = content.replace(
    'const honourAiPageTarget = entryMode === "ai" && !hasUserEditedRef.current;',
    'const honourAiPageTarget = !activeTemplateId && !hasUserEditedRef.current;'
)

# 2. resolveFileNameBase
content = content.replace(
    'if (entryMode === "template" && activeTemplateId) {',
    'if (activeTemplateId && activeTemplateId !== "Blank Document") {'
)

# 3. remove setEntryMode
content = content.replace('setEntryMode("template");', '// removed setEntryMode')
content = content.replace('setEntryMode("ai");', '// removed setEntryMode')

# 4. Fix Back Button
back_btn_old = """                  <button
                    onClick={() => {
                      setView(entryMode === "template" ? "templates" : "compose");
                      if (entryMode !== "template") setPrompt("");
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#374151] transition-all shadow-sm active:scale-95"
                  >
                    <ArrowLeft className="h-4 w-4 text-[#dd7230]" />
                    <span>{entryMode === "template" ? "Back to Templates" : "New Prompt"}</span>
                  </button>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#dd7230] flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      {entryMode === "template" ? "KNOWLEDGE REPOSITORY DOCUMENT" : "AI DOCUMENT GENERATOR"}
                    </span>"""
                    
back_btn_new = """                  <button
                    onClick={() => {
                      setView("wizard");
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#374151] transition-all shadow-sm active:scale-95"
                  >
                    <ArrowLeft className="h-4 w-4 text-[#dd7230]" />
                    <span>Back to Wizard</span>
                  </button>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#dd7230] flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      {activeTemplateId ? "TEMPLATE DOCUMENT" : "AI DOCUMENT"}
                    </span>"""

content = content.replace(back_btn_old, back_btn_new)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Removed all entryMode references!")
