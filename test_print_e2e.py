import requests, urllib.parse

# Simulate exactly what the frontend does: fetch the template then do replacements
url = f"http://localhost:8000/documents/{urllib.parse.quote('CAR Form 1 Template')}/content"
res = requests.get(url)
data = res.json()
html = data.get("content_html", "")

CHECKED = "\u2611"
UNCHECKED = "\u2610"

text_replacements = {
    "[CAR_NO]": "CAR-2026-001",
    "[CAMPUS]": "Argao Campus",
    "[DATE_ISSUED]": "2026-09-30",
    "[AREA]": "Academic Affairs",
    "[AUDITOR]": "John Doe",
    "[ACKNOWLEDGED_BY]": "Jane Smith",
    "[FINDINGS]": "Non-conformity found in document control.",
    "[IMMEDIATE_ACTION]": "Immediate corrective steps taken.",
    "[ROOT_CAUSE]": "Lack of training.",
    "[CORRECTIVE_MEASURE]": "Conduct training sessions.",
    "[PROPOSED_BY]": "Jane Smith",
    "[TARGET_DATE]": "2026-10-15",
    "[OTHER_DESC]": "",
    "[FOLLOWUP_DATE]": "N/A",
    "[REMARKS]": "No remarks."
}

for key, val in text_replacements.items():
    html = html.replace(key, val)

# Apply checkboxes
html = html.replace("[CHECK_MAJOR]", UNCHECKED)
html = html.replace("[CHECK_MINOR]", CHECKED)
html = html.replace("[CHECK_OBS]", UNCHECKED)
html = html.replace("[CHECK_QMS]", CHECKED)
html = html.replace("[CHECK_SECURITY]", UNCHECKED)
html = html.replace("[CHECK_FEEDBACK]", UNCHECKED)
html = html.replace("[CHECK_COMPLAINT]", UNCHECKED)
html = html.replace("[CHECK_OTHER]", UNCHECKED)
html = html.replace("[CHECK_EFFECTIVE]", UNCHECKED)
html = html.replace("[CHECK_INEFFECTIVE]", UNCHECKED)
html = html.replace("[STATUS_CLOSED]", UNCHECKED)
html = html.replace("[FOLLOWUP_COMPLETE]", UNCHECKED)
html = html.replace("[FOLLOWUP_INEFFECTIVE]", UNCHECKED)

# Check for remaining placeholders
import re
remaining = re.findall(r'\[([A-Z_]+)\]', html)
if remaining:
    print("Unreplaced placeholders:", set(remaining))
else:
    print("All placeholders replaced successfully!")

print("Final HTML length:", len(html))
print("Contains CHECK box char:", CHECKED in html)
