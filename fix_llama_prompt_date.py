import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

old_prompt = """        system_prompt = \"\"\"You are a meticulous Quality Assurance Data Extractor for an ISO 9001:2015 system.
Your job is to parse a scanned Corrective Action Request (CAR) Form 1 from the provided image. 

CRITICAL CONTEXT: Only the TOP HALF of this form is filled out. The bottom sections (Immediate Action, Root Cause, Corrective Measure, Target Date) are completely blank. DO NOT try to extract them; return empty strings for those fields.

Focus entirely on the top headers and checkboxes. For checkboxes (MAJOR, MINOR, OBSERVATION, QMS Related, etc.), visually look for an 'X' or checkmark. Note that the Date is sometimes written in the top right corner if the 'Date:' field is blank. Look for signatures over the printed names.

Return a pure JSON object exactly like this, replacing the values with the actual extracted text from the image:"""

new_prompt = """        system_prompt = \"\"\"You are a meticulous Quality Assurance Data Extractor for an ISO 9001:2015 system.
Your job is to parse a scanned Corrective Action Request (CAR) Form 1 from the provided image. 

CRITICAL CONTEXT: Only the TOP HALF of this form is filled out. The bottom sections (Immediate Action, Root Cause, Corrective Measure, Target Date) are completely blank. DO NOT try to extract them; return empty strings for those fields.

Focus entirely on the top headers and checkboxes. For checkboxes (MAJOR, MINOR, OBSERVATION, QMS Related, etc.), visually look for an 'X' or checkmark. 
CRITICAL DATE EXTRACTION: Prioritize extracting the date written explicitly next to the 'Date:' label (e.g. 'September 29, 2026'). Only if that line is completely blank, fallback to the date stamped in the top right corner. Look for signatures over the printed names.

Return a pure JSON object exactly like this, replacing the values with the actual extracted text from the image:"""

content = content.replace(old_prompt, new_prompt)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Prompt successfully updated for strict date extraction.")
