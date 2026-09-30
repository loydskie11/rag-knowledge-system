import re
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """                            immediate_action: data.immediate_action || "",
                            corrective_measure: data.corrective_measure || ""
                        }));"""
repl = """                            immediate_action: data.immediate_action || "",
                            corrective_measure: data.corrective_measure || "",
                            follow_up_result: data.follow_up_result || "",
                            follow_up_date: (() => {
                                const rawDate = data.follow_up_date || "";
                                if (!rawDate || rawDate.includes("YYYY") || rawDate.includes("Extracted")) return "";
                                const d = new Date(rawDate);
                                return isNaN(d.getTime()) ? "" : d.toISOString().split('T')[0];
                            })(),
                            comments_remarks: data.comments_remarks || "",
                            non_conformity_closed: data.non_conformity_closed || false
                        }));"""

if target in content:
    content = content.replace(target, repl)
    with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated extraction mapping.")
else:
    print("Could not find extraction target.")
