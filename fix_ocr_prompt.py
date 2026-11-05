import re
with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

old_prompt_block = """  CRITICAL CONTEXT: Only the TOP HALF of this form is filled out. The bottom sections (Immediate Action, Root Cause, Corrective Measure, Target Date) are completely blank. DO NOT try to extract them; return empty strings for those fields."""
new_prompt_block = """  CONTEXT: A CAR form may be partially or fully filled out. If the bottom sections (Immediate Action, Root Cause, Corrective Measure, Target Date, Follow-Up Action Results, Comments/Remarks) are empty, return empty strings for those text fields. If they are filled out, extract them accurately."""

content = content.replace(old_prompt_block, new_prompt_block)

old_json = """  "root_cause": "",
  "immediate_action": "",
  "corrective_measure": ""
}"""
new_json = """  "root_cause": "",
  "immediate_action": "",
  "corrective_measure": "",
  "follow_up_result": "Measures complete and effective OR Measures ineffective",
  "follow_up_date": "Extracted Follow Up Date (YYYY-MM-DD)",
  "comments_remarks": "Extracted Comments/Remarks",
  "non_conformity_closed": false
}"""

content = content.replace(old_json, new_json)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated OCR prompt!")
