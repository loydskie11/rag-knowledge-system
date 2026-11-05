import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# We need to replace:
# {wizardPlaceholders.map(ph => (
#   <div key={ph}>
#     <label className="block text-xs font-medium text-gray-600 mb-1">{ph.replace(/\[|\]/g, "")}</label>
#     <input 
#       type="text"
#       value={wizardForm[ph] || ""}
#       onChange={(e) => setWizardForm({...wizardForm, [ph]: e.target.value})}
#       placeholder={`Enter ${ph.replace(/\[|\]/g, "")}`}
#       className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#dd7230]"
#     />
#   </div>
# ))}

old_ui_start = content.find('{wizardPlaceholders.map(ph => (')
old_ui_end = content.find('</div>\n            </div>\n          )}', old_ui_start)

if old_ui_start != -1 and old_ui_end != -1:
    new_ui = """{wizardPlaceholders.map(group => {
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
              """
    
    content = content[:old_ui_start] + new_ui + content[old_ui_end:]
    with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched UI loop successfully!")
else:
    print("Could not find UI loop")
