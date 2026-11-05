import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# We need to extract the wizard view block and replace it.
start_str = '  if (view === "wizard") {'
end_str = '  return null;\n}'

start_idx = content.find(start_str)
end_idx = content.find(end_str, start_idx)

if start_idx != -1 and end_idx != -1:
    wizard_ui_new = """  if (view === "wizard") {
    return (
      <div className="space-y-6 flex flex-col min-h-[calc(100vh-6rem)] relative max-w-6xl mx-auto w-full animate-in fade-in duration-300">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Draft New Document</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Select a template, configure details, and let AI generate the content.</p>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-xs font-semibold text-rose-800">Error</h3>
              <p className="text-[11px] text-rose-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative flex-1">
          {/* --- CONFIGURATION SECTION (Left) --- */}
          <div className="lg:col-span-1 space-y-4 sticky top-6 self-start">
            <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
              <div className="p-3.5 bg-gray-50/80 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 text-xs flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-[#DD7230]" /> Document Configuration
                </h3>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Select Template</label>
                  <div className="flex flex-col gap-2">
                    <select 
                      value={wizardTemplate ? wizardTemplate.name : ""} 
                      onChange={handleWizardTemplateSelect}
                      className="w-full py-2 px-3 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-colors"
                    >
                      <option value="">-- Choose a Template --</option>
                      {templates.map(t => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2 my-1">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">OR</span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                    <button 
                      onClick={() => {
                        setWizardTemplate({ name: "Blank Document" });
                        setWizardHtml("<p><br/></p>");
                        setWizardPlaceholders([]);
                        setWizardForm({});
                      }}
                      className="w-full py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition-all shadow-2xs"
                    >
                      Draft from scratch
                    </button>
                  </div>
                </div>

                {wizardTemplate && !wizardLoading && (
                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700">AI Generation Prompt</label>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">Provide instructions. The AI will generate body paragraphs and merge them with your details.</p>
                    </div>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. Draft a memo informing college deans about upcoming midterms..."
                      className="w-full h-28 p-3 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] resize-none transition-colors"
                    />
                    
                    <button
                      onClick={handleWizardGenerate}
                      disabled={status === "generating" || !prompt.trim()}
                      className="w-full mt-2 py-2.5 bg-[#DD7230] text-white rounded-lg hover:bg-[#DD7230] transition-all disabled:opacity-50 disabled:hover:bg-[#DD7230] flex justify-center items-center gap-2 text-xs font-semibold shadow-2xs cursor-pointer active:scale-95"
                    >
                      {status === "generating" ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing & Generating...</>
                      ) : (
                        "Generate & Review"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* --- DETAILS SECTION (Right) --- */}
          <div className="lg:col-span-2">
            {wizardLoading ? (
              <div className="bg-white rounded-xl shadow-2xs border border-gray-200 h-full min-h-[460px] flex flex-col items-center justify-center p-8 text-center">
                <Loader2 className="h-8 w-8 text-[#DD7230] animate-spin mb-4" />
                <h3 className="text-base font-semibold text-gray-900">Extracting Fields...</h3>
                <p className="text-xs text-gray-500 max-w-sm mt-1.5 leading-relaxed">Analyzing template structure and extracting dynamic placeholders.</p>
              </div>
            ) : wizardTemplate ? (
              <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden h-full min-h-[460px] animate-in fade-in duration-300 flex flex-col">
                <div className="p-3.5 bg-gray-50/80 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900 text-xs flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-[#DD7230]" /> Template Details
                  </h3>
                </div>
                <div className="p-6 sm:p-8 flex-1">
                  <div className="mb-6">
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      {wizardTemplate.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Please fill in the required placeholders below.</p>
                  </div>
                  
                  {wizardPlaceholders.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                      {wizardPlaceholders.map(group => {
                        const label = group.norm.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        return (
                        <div key={group.norm}>
                          <label className="block text-[11px] font-medium text-gray-700 mb-1.5">{label}</label>
                          <input 
                            type="text"
                            value={wizardForm[group.norm] || ""}
                            onChange={(e) => setWizardForm({...wizardForm, [group.norm]: e.target.value})}
                            placeholder={`Enter ${label}`}
                            className="w-full py-2 px-3 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-colors"
                          />
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                      <div className="mx-auto w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center mb-3 text-gray-400">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-700">No Dynamic Fields Found</h3>
                      <p className="text-xs text-gray-400 mt-1 max-w-[240px] mx-auto">This template does not require any manual input details. You can proceed directly to generation.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 h-full min-h-[460px] flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-2xs border border-gray-200 text-gray-400">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Awaiting Template Selection</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-[240px] mx-auto">Select a document template from the left panel to begin filling out details and drafting.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
"""

    content = content[:start_idx] + wizard_ui_new + content[end_idx + 15:]
    with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched UI successfully!")
else:
    print("Could not find start/end indices")
