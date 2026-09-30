import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """        "[FOLLOWUP_DATE]": car.follow_up_date || "N/A",
        "[REMARKS]": (car.remarks || "No additional remarks.").replace(/\\n/g, "<br>")
      };"""

repl = """        "[FOLLOWUP_DATE]": car.follow_up_date || "N/A",
        "[REMARKS]": (car.comments_remarks || "No additional remarks.").replace(/\\n/g, "<br>")
      };"""

content = content.replace(target, repl)

target2 = """      const checkboxMap: Record<string, boolean> = {
        "[CHECK_MAJOR]": car.finding_category === "MAJOR",
        "[CHECK_MINOR]": car.finding_category === "MINOR",
        "[CHECK_OBS]": car.finding_category === "OBSERVATION",
        "[CHECK_QMS]": (car.type_of_non_conformity || "").includes("QMS"),
        "[CHECK_SECURITY]": (car.type_of_non_conformity || "").includes("Security"),
        "[CHECK_FEEDBACK]": (car.type_of_non_conformity || "").includes("Feedback"),
        "[CHECK_COMPLAINT]": (car.type_of_non_conformity || "").includes("Complaint"),
        "[CHECK_OTHER]": (car.type_of_non_conformity || "").includes("Other"),
      };"""

repl2 = """      const checkboxMap: Record<string, boolean> = {
        "[CHECK_MAJOR]": car.finding_category === "MAJOR",
        "[CHECK_MINOR]": car.finding_category === "MINOR",
        "[CHECK_OBS]": car.finding_category === "OBSERVATION",
        "[CHECK_QMS]": (car.type_of_non_conformity || "").includes("QMS"),
        "[CHECK_SECURITY]": (car.type_of_non_conformity || "").includes("Security"),
        "[CHECK_FEEDBACK]": (car.type_of_non_conformity || "").includes("Feedback"),
        "[CHECK_COMPLAINT]": (car.type_of_non_conformity || "").includes("Complaint"),
        "[CHECK_OTHER]": (car.type_of_non_conformity || "").includes("Other"),
        "[CHECK_EFFECTIVE]": (car.follow_up_result || "").includes("effective") && !(car.follow_up_result || "").includes("ineffective"),
        "[CHECK_INEFFECTIVE]": (car.follow_up_result || "").includes("ineffective"),
      };"""

if target in content and target2 in content:
    content = content.replace(target, repl)
    content = content.replace(target2, repl2)
    with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated export replacements.")
else:
    print("Could not find targets in AccreditationSupport.tsx.")
