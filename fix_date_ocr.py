import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

old_date_instruction = """CRITICAL DATE EXTRACTION: Prioritize extracting the date written explicitly next to the 'Date:' label (e.g. 'September 29, 2026'). Only if that line is completely blank, fallback to the date stamped in the top right corner. Look for signatures over the printed names."""

new_date_instruction = """CRITICAL DATE EXTRACTION: Prioritize extracting the date written explicitly next to the 'Date:' label. Only if that line is completely blank, fallback to the date stamped in the top right corner. IMPORTANT: You must convert and format the final date strictly as YYYY-MM-DD (e.g. '2026-09-29'). Do not write words like 'September'. Look for signatures over the printed names."""

content = content.replace(old_date_instruction, new_date_instruction)

old_json_template = """"date_issued": "Extracted Date","""
new_json_template = """"date_issued": "YYYY-MM-DD","""
content = content.replace(old_json_template, new_json_template)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated prompt to enforce YYYY-MM-DD formatting.")
