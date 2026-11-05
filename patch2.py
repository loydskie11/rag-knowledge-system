import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the old if (view === "chooser") block
# Remove the old if (view === "templates") block
# This is tricky with regex because of nested braces. Let's just remove everything between
# `if (view === "chooser") {` and `if (view === "editor") {`

start_idx = content.find('  if (view === "chooser") {')
end_idx = content.find('  if (view === "editor") {')

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# Now replace the return (...) at the bottom of the component
# We'll search for `  return (\n      <div className="space-y-6">`
# and replace it down to the start of `function ChooserScreen`
ret_start = content.find('  return (\n      <div className="space-y-6">')
chooser_def = content.find('function ChooserScreen')

new_return = """  if (view === "wizard") {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#dd7230] rounded-xl flex items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#1F2937]">Draft New Document</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">Select a template, fill out the details, and let AI generate the content.</p>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl mb-6">
            <AlertCircle className="h-5 w-5 text-rose-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-rose-800">Error</h3>
              <p className="text-xs text-rose-600 mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div>
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
          
          {wizardTemplate && !wizardLoading && wizardPlaceholders.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-gray-100">
              <label className="block text-sm font-semibold text-gray-700">2. Fill Template Details</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wizardPlaceholders.map(ph => (
                  <div key={ph}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{ph.replace(/\[|\]/g, "")}</label>
                    <input 
                      type="text"
                      value={wizardForm[ph] || ""}
                      onChange={(e) => setWizardForm({...wizardForm, [ph]: e.target.value})}
                      placeholder={`Enter ${ph.replace(/\[|\]/g, "")}`}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#dd7230]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {wizardTemplate && !wizardLoading && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <label className="block text-sm font-semibold text-gray-700">3. Main Body Generation (AI)</label>
              <p className="text-xs text-gray-500">Provide instructions for the main content of the document. The AI will generate only the body paragraphs and merge them with your details above.</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Draft a memo informing all college deans about the upcoming Midterm exams scheduled next week..."
                className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#dd7230] resize-none"
              />
              
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleWizardGenerate}
                  disabled={status === "generating" || !prompt.trim()}
                  className="px-6 py-2.5 bg-[#dd7230] hover:bg-[#c26020] text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {status === "generating" ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Generate & Review</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Fallback
  return null;
}
"""

if ret_start != -1 and chooser_def != -1:
    content = content[:ret_start] + new_return + content[chooser_def:]

# Remove ChooserScreen and TemplatesScreen completely
chooser_def = content.find('function ChooserScreen')
if chooser_def != -1:
    content = content[:chooser_def]

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched UI")
