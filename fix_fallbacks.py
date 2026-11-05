import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_replacements = """      const textReplacements: Record<string, string> = {
        "[CAR_NO]": car.car_no || "N/A",
        "[CAMPUS]": car.campus || "Argao Campus",
        "[DATE_ISSUED]": car.date_issued || "N/A",
        "[AREA]": car.area || "N/A",
        "[AUDITOR]": car.auditor_name || "______________________",
        "[ACKNOWLEDGED_BY]": car.acknowledged_by || "______________________",
        "[FINDINGS]": (car.findings || "").replace(/\\n/g, "<br>"),
        "[IMMEDIATE_ACTION]": (car.immediate_action || "None specified.").replace(/\\n/g, "<br>"),
        "[ROOT_CAUSE]": (car.root_cause || "None specified.").replace(/\\n/g, "<br>"),
        "[CORRECTIVE_MEASURE]": (car.corrective_measure || "None specified.").replace(/\\n/g, "<br>"),
        "[PROPOSED_BY]": car.measures_proposed_by || car.acknowledged_by || "______________________",
        "[TARGET_DATE]": car.target_date || "N/A",
        "[OTHER_DESC]": car.other_type_description || "",
        "[FOLLOWUP_DATE]": car.follow_up_date || "N/A",
        "[REMARKS]": (car.remarks || "No additional remarks.").replace(/\\n/g, "<br>")
      };"""

new_replacements = """      const textReplacements: Record<string, string> = {
        "[CAR_NO]": car.car_no || "N/A",
        "[CAR Number]": car.car_no || "N/A",
        "[CAMPUS]": car.campus || "Argao Campus",
        "[DATE_ISSUED]": car.date_issued || "N/A",
        "[AREA]": car.area || "N/A",
        "[AUDITOR]": car.auditor_name || "______________________",
        "[ACKNOWLEDGED_BY]": car.acknowledged_by || "______________________",
        "[FINDINGS]": (car.findings || "").replace(/\\n/g, "<br>"),
        "[IMMEDIATE_ACTION]": (car.immediate_action || "None specified.").replace(/\\n/g, "<br>"),
        "[ROOT_CAUSE]": (car.root_cause || "None specified.").replace(/\\n/g, "<br>"),
        "[CORRECTIVE_MEASURE]": (car.corrective_measure || "None specified.").replace(/\\n/g, "<br>"),
        "[PROPOSED_BY]": car.measures_proposed_by || car.acknowledged_by || "______________________",
        "[TARGET_DATE]": car.target_date || "N/A",
        "[OTHER_DESC]": car.other_type_description || "",
        "[FOLLOWUP_DATE]": car.follow_up_date || "N/A",
        "[REMARKS]": (car.remarks || "No additional remarks.").replace(/\\n/g, "<br>")
      };"""

content = content.replace(old_replacements, new_replacements)

old_cat = """    const category = (car.finding_category || "").toUpperCase();
    html = html.split("[CAT_MAJOR]").join(category === "MAJOR" ? CHECKED : UNCHECKED);
    html = html.split("[CAT_MINOR]").join(category === "MINOR" ? CHECKED : UNCHECKED);
    html = html.split("[CAT_OBSERVATION]").join(category === "OBSERVATION" ? CHECKED : UNCHECKED);"""

new_cat = """    const category = (car.finding_category || "").toUpperCase();
    html = html.split("[CAT_MAJOR]").join(category === "MAJOR" ? CHECKED : UNCHECKED);
    html = html.split("[CAT_MINOR]").join(category === "MINOR" ? CHECKED : UNCHECKED);
    html = html.split("[CAT_OBSERVATION]").join(category === "OBSERVATION" ? CHECKED : UNCHECKED);
    html = html.split("[CAT_OBERSERVATION]").join(category === "OBSERVATION" ? CHECKED : UNCHECKED);"""

content = content.replace(old_cat, new_cat)

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Added fallbacks for AccreditationSupport.")
