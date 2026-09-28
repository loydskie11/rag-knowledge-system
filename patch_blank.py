import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add a "Blank AI Document" button when no template is selected
old_select = """          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">1. Select Template</label>
            <select 
              value={wizardTemplate ? wizardTemplate.name : ""} 
              onChange={handleWizardTemplateSelect}
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#dd7230]"
            >
              <option value="">-- Choose a Template --</option>
              {templates.map(t => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
          
          {wizardLoading && <div className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Loading template fields...</div>}
"""

new_select = """          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">1. Select Template</label>
            <div className="flex gap-3 items-center">
              <select 
                value={wizardTemplate ? wizardTemplate.name : ""} 
                onChange={handleWizardTemplateSelect}
                className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#dd7230]"
              >
                <option value="">-- Choose a Template --</option>
                {templates.map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
              <span className="text-sm text-gray-400 font-medium">OR</span>
              <button 
                onClick={() => {
                  setWizardTemplate({ name: "Blank Document" });
                  setWizardHtml("<p><br/></p>");
                  setWizardPlaceholders([]);
                  setWizardForm({});
                }}
                className="px-4 py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
              >
                Draft from scratch
              </button>
            </div>
          </div>
          
          {wizardLoading && <div className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Loading template fields...</div>}
"""

content = content.replace(old_select, new_select)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Patched blank doc")
