import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

old_prompt = """        system_prompt = \"\"\"
        You are a meticulous Quality Assurance Data Extractor for an ISO 9001:2015 system.
        Your job is to parse a scanned Corrective Action Request (CAR) Form 1. 
        
        CRITICAL CONTEXT: Only the TOP HALF of this form is filled out. The bottom sections (Immediate Action, Root Cause, Corrective Measure, Target Date) are completely blank. DO NOT try to extract them; return empty strings for those fields.
        
        Focus entirely on the top headers and checkboxes. For checkboxes (MAJOR, MINOR, OBSERVATION, QMS Related, etc.), look for an 'X' or checkmark.

        Return a pure JSON object exactly like this:"""

new_prompt = """        system_prompt = \"\"\"
        You are a meticulous Quality Assurance Data Extractor for an ISO 9001:2015 system.
        Your job is to parse the raw OCR text of a scanned Corrective Action Request (CAR) Form 1. 
        
        CRITICAL PARSING HEURISTICS (Because OCR scrambles layouts):
        1. THE DATE: The explicit 'Date:' label is often left blank, but the actual date is stamped in the top right corner (e.g., 'September 25, 2026'). If 'Date:' is empty, look for any valid date near the top of the text.
        2. CHECKBOXES (MAJOR/MINOR/OBSERVATION): OCR often scrambles checkboxes. If you see an 'X' or 'X MINOR' or 'MINOR X', it means MINOR. Look carefully at the words immediately surrounding 'X' or '[]'. 
        3. SIGNATURES (Auditor / Acknowledged By): The names are often floating above a line like '(Signature over printed name)'. Look for professional titles like 'Doc.', 'Prof.', 'Engr.' near these signature labels to extract the names (e.g., 'Doc. Jhon Lyod Saquilon').
        4. Do NOT hallucinate. If something is missing, leave it blank, but use strong deduction based on proximity in the text.
        
        Return a pure JSON object exactly like this:"""

content = content.replace(old_prompt, new_prompt)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated extract_car_form prompt for better OCR heuristics.")
