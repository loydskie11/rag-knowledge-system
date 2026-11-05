import sys
import re

with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

car_tab_button = """                <button
                  onClick={() => setIsoSubTab("car")}
                  className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    isoSubTab === "car"
                      ? "border-[#DD7230] text-gray-900 font-bold"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  CAR Forms ({carForms.length})
                </button>
              </div>"""

content = content.replace('                </button>\n              </div>', '                </button>\n' + car_tab_button)

# Remove duplicates in case it ran multiple times or matched multiple
with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Added CAR forms sub-tab button!")
