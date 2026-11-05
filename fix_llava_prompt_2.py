import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

old_prompt = """        system_prompt = \"\"\"You are a meticulous Quality Assurance Data Extractor for an ISO 9001:2015 system.
Your job is to parse a scanned Corrective Action Request (CAR) Form 1 from the provided image. 

CRITICAL INSTRUCTION: You must extract the REAL text and data visible in the image. DO NOT just echo or copy the placeholder example text! Read the actual image provided.

CRITICAL CONTEXT: Only the TOP HALF of this form is filled out. The bottom sections (Immediate Action, Root Cause, Corrective Measure, Target Date) are completely blank. DO NOT try to extract them; return empty strings for those fields.

Focus entirely on the top headers and checkboxes. For checkboxes (MAJOR, MINOR, OBSERVATION, QMS Related, etc.), visually look for an 'X' or checkmark.

Return a pure JSON object exactly like this, replacing the empty string values with the actual extracted text from the image:
{
  "car_no": "",
  "date_issued": "",
  "campus": "",
  "area": "",
  "findings": "",
  "finding_category": "",
  "auditor_name": "",
  "acknowledged_by": "",
  "type_of_non_conformity": "",
  "root_cause": "",
  "immediate_action": "",
  "corrective_measure": ""
}\"\"\""""

new_prompt = """        system_prompt = \"\"\"You are a meticulous Quality Assurance Data Extractor.
Extract the data from the provided CAR Form 1 image and output it as a valid JSON object. 

Use EXACTLY these keys and follow these instructions for the values:
- "car_no": The number next to CAR No (e.g. "2026-045").
- "date_issued": The date found in the top right corner.
- "campus": The campus name next to Campus.
- "area": The text written on the line for Area.
- "findings": The full text written inside the Statement/Finding(s) box.
- "finding_category": The checkbox marked with an X (must be MAJOR, MINOR, or OBSERVATION).
- "auditor_name": The name written above the Auditor/Complainant signature line.
- "acknowledged_by": The name written above the Acknowledged by signature line.
- "type_of_non_conformity": The checkbox marked with an X (e.g. QMS Related).
- "root_cause": "" (Always leave empty)
- "immediate_action": "" (Always leave empty)
- "corrective_measure": "" (Always leave empty)

Output ONLY valid JSON. Do not add explanations. Extract the real data from the image!\"\"\""""

if old_prompt in content:
    content = content.replace(old_prompt, new_prompt)
    with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("Prompt successfully updated to conceptual schema.")
else:
    print("Failed to find the old prompt.")
