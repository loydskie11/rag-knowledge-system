import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

old_prompt = """        system_prompt = \"\"\"You are a meticulous Quality Assurance Data Extractor for an ISO 9001:2015 system.
Your job is to parse a scanned Corrective Action Request (CAR) Form 1 from the provided image. 

CRITICAL CONTEXT: Only the TOP HALF of this form is filled out. The bottom sections (Immediate Action, Root Cause, Corrective Measure, Target Date) are completely blank. DO NOT try to extract them; return empty strings for those fields.

Focus entirely on the top headers and checkboxes. For checkboxes (MAJOR, MINOR, OBSERVATION, QMS Related, etc.), visually look for an 'X' or checkmark.

Return a pure JSON object exactly like this:
{
  "car_no": "Extracted CAR No",
  "date_issued": "Extracted Date",
  "campus": "Extracted Campus",
  "area": "Extracted Area",
  "findings": "Extracted Statement/Finding(s)",
  "finding_category": "MAJOR or MINOR or OBSERVATION or UNKNOWN",
  "auditor_name": "Extracted Auditor/Complainant",
  "acknowledged_by": "Extracted Acknowledged by",
  "type_of_non_conformity": "QMS Related or Security Related or Customer Feedback or Customer Complaint or Other",
  "root_cause": "",
  "immediate_action": "",
  "corrective_measure": ""
}\"\"\""""

new_prompt = """        system_prompt = \"\"\"You are a meticulous Quality Assurance Data Extractor for an ISO 9001:2015 system.
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

if old_prompt in content:
    content = content.replace(old_prompt, new_prompt)
    with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("Prompt successfully updated.")
else:
    print("Failed to find the old prompt.")
