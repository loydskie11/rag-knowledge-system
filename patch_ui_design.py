import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

wizard_ui_old = """      return (
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
            
            {wizardTemplate && !wizardLoading && wizardPlaceholders.length > 0 && (
              <div className="space-y-6 pt-4 border-t border-gray-100">
                <label className="block text-sm font-semibold text-gray-700">2. Fill Template Details</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wizardPlaceholders.map(group => {
                    // Format the label nicely (capitalize words)
                    const label = group.norm.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    return (
                    <div key={group.norm}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                      <input 
                        type="text"
                        value={wizardForm[group.norm] || ""}
                        onChange={(e) => setWizardForm({...wizardForm, [group.norm]: e.target.value})}
                        placeholder={`Enter ${label}`}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#dd7230]"
                      />
                    </div>
                    );
                  })}
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
      );"""

wizard_ui_new = """      return (
        <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)] relative max-w-5xl mx-auto w-full">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Draft New Document</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Select a template, fill out the details, and let AI generate the content.</p>
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

          <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-2xs space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">1. Select Template</label>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <select 
                  value={wizardTemplate ? wizardTemplate.name : ""} 
                  onChange={handleWizardTemplateSelect}
                  className="flex-1 py-2 px-3 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-colors"
                >
                  <option value="">-- Choose a Template --</option>
                  {templates.map(t => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-400 font-medium">OR</span>
                <button 
                  onClick={() => {
                    setWizardTemplate({ name: "Blank Document" });
                    setWizardHtml("<p><br/></p>");
                    setWizardPlaceholders([]);
                    setWizardForm({});
                  }}
                  className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition-all shadow-2xs"
                >
                  Draft from scratch
                </button>
              </div>
            </div>
            
            {wizardLoading && <div className="text-xs text-gray-500 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin"/> Loading template fields...</div>}
            
            {wizardTemplate && !wizardLoading && wizardPlaceholders.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-700">2. Fill Template Details</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wizardPlaceholders.map(group => {
                    const label = group.norm.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    return (
                    <div key={group.norm}>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">{label}</label>
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
              </div>
            )}

            {wizardTemplate && !wizardLoading && (
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700">3. Main Body Generation (AI)</label>
                  <p className="text-[11px] text-gray-500 mt-0.5">Provide instructions for the main content. The AI will generate only the body paragraphs and merge them with your details above.</p>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Draft a memo informing all college deans about the upcoming Midterm exams scheduled next week..."
                  className="w-full h-28 p-3 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] resize-none transition-colors"
                />
                
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleWizardGenerate}
                    disabled={status === "generating" || !prompt.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#DD7230] text-white text-xs font-semibold rounded-lg hover:bg-[#c4612a] transition-all shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === "generating" ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> <span>Generating...</span></>
                    ) : (
                      <span>Generate & Review</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );"""

# Escape for regex replace or just use literal string replace. 
# String replace is safer.
if wizard_ui_old in content:
    content = content.replace(wizard_ui_old, wizard_ui_new)
    print("Replaced UI successfully!")
else:
    # Let's try matching chunks
    print("Could not find exact match. Will try fuzzy replace.")
    start_str = '  if (view === "wizard") {'
    end_str = '  return null;'
    start_idx = content.find(start_str)
    end_idx = content.find(end_str, start_idx)
    if start_idx != -1 and end_idx != -1:
        # Construct the full block
        full_new_block = start_str + '\n' + wizard_ui_new + '\n  }\n\n'
        content = content[:start_idx] + full_new_block + content[end_idx:]
        print("Replaced via boundaries!")
    else:
        print("Failed to find boundaries.")

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)
