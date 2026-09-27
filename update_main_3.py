import sys
import re

with open("c:/Projects/rag-governance/backend/main.py", "r", encoding="utf-8") as f:
    content = f.read()

pattern = r'system_prompt = """\s*You are a meticulous Quality Assurance Data Extractor.*?return \{\s*"findings":\s*str\(parsed\.get\("findings", ""\)\),.*?\}'

new_code = '''system_prompt = """
        You are a meticulous Quality Assurance Data Extractor for an ISO 9001:2015 system at Cebu Technological University.
        Your job is to parse scrambled OCR text from a completed Corrective Action Request (CAR) Form 1 and extract every detail into a strict JSON object.

        The form contains headers, checkboxes, and text fields. 
        For checkboxes (like MAJOR, MINOR, OBSERVATION, or Type of Non-Conformity), look for an "X", a checkmark, or filled boxes near the label. Return true if checked, false if empty.

        You MUST respond with a pure JSON object in this EXACT format (no markdown, no extra text). Use empty strings "" for missing text.
        {
          "car_no": "Extracted CAR No. XX-XXXX",
          "date": "Extracted Date",
          "revision": "Extracted Revision number",
          "campus": "Extracted Campus",
          "area": "Extracted Area",
          "finding_category": "MAJOR" | "MINOR" | "OBSERVATION" | "UNKNOWN",
          "auditor_name": "Extracted Auditor/Complainant name",
          "acknowledged_by": "Extracted Acknowledged by name",
          "type_of_non_conformity": {
            "qms_related": true/false,
            "security_related": true/false,
            "customer_feedback": true/false,
            "customer_complaint": true/false,
            "other": "Specify if 'Other' is checked and written, else empty string"
          },
          "findings": "Extracted Statement/Finding(s) text",
          "root_cause": "Extracted Non-Conformity Root Cause(s) text",
          "immediate_action": "Extracted Immediate Action(s) text",
          "corrective_measure": "Extracted Proposed Corrective Measure(s) text"
        }
        """

        response = groq_client.chat.completions.create(
            model="qwen-2.5-32b",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": f"Here is the raw OCR text extracted from the CAR Form 1:\\n\\n{raw_text}"}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        result_json = response.choices[0].message.content
        import json
        parsed = json.loads(result_json)

        return parsed'''

new_content = re.sub(pattern, new_code.replace('\\', '\\\\'), content, flags=re.DOTALL)

if new_content != content:
    with open("c:/Projects/rag-governance/backend/main.py", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replaced with regex successfully!")
else:
    print("Regex did not match.")
