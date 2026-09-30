import re
with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target1 = """    area: "", findings: "", root_cause: "", immediate_action: "", corrective_measure: "",
    measures_proposed_by: "", target_date: "", status: "Open"
  });"""

repl1 = """    area: "", findings: "", root_cause: "", immediate_action: "", corrective_measure: "",
    measures_proposed_by: "", target_date: "", status: "Open",
    follow_up_result: "", follow_up_date: "", comments_remarks: "", non_conformity_closed: false
  });"""

target2 = """          area: "", findings: "", root_cause: "", immediate_action: "", corrective_measure: "",
          measures_proposed_by: "", target_date: "", status: "Open"
        });"""

repl2 = """          area: "", findings: "", root_cause: "", immediate_action: "", corrective_measure: "",
          measures_proposed_by: "", target_date: "", status: "Open",
          follow_up_result: "", follow_up_date: "", comments_remarks: "", non_conformity_closed: false
        });"""

content = content.replace(target1, repl1)
content = content.replace(target2, repl2)

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated state defaults.")
