import re

with open(r"c:\Projects\rag-governance\backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

# Define the old function entirely
pattern = r'@app\.post\("/api/extract-car-form"\)\nasync def extract_car_form.*?except Exception as e:\n\s*print\(f"\[extract_car_form\] Error: \{e\}"\)\n\s*raise HTTPException\(status_code=500, detail="Failed to extract data from the CAR form\."\)'

new_func = '''@app.post("/api/extract-car-form")
async def extract_car_form(file: UploadFile = File(...)):
    """
    Accepts a scanned CAR Form 1 (PDF or image) and uses llama3.2-vision 
    to natively extract the key CAR fields into a structured JSON response 
    without relying on external OCR flattening.
    """
    try:
        import base64
        
        contents = await file.read()
        filename_lower = file.filename.lower()
        
        if filename_lower.endswith(".pdf"):
            import fitz
            doc = fitz.open(stream=contents, filetype="pdf")
            page = doc.load_page(0)
            pix = page.get_pixmap(dpi=150)
            img_data = pix.tobytes("jpeg")
            base64_image = base64.b64encode(img_data).decode("utf-8")
        elif filename_lower.endswith((".png", ".jpg", ".jpeg")):
            base64_image = base64.b64encode(contents).decode("utf-8")
        else:
            raise HTTPException(status_code=400, detail="Please upload a PDF or Image file (.pdf, .png, .jpg, .jpeg).")

        system_prompt = """You are a meticulous Quality Assurance Data Extractor for an ISO 9001:2015 system.
Your job is to parse a scanned Corrective Action Request (CAR) Form 1 from the provided image. 

CRITICAL CONTEXT: Only the TOP HALF of this form is filled out. The bottom sections (Immediate Action, Root Cause, Corrective Measure, Target Date) are completely blank. DO NOT try to extract them; return empty strings for those fields.

Focus entirely on the top headers and checkboxes. For checkboxes (MAJOR, MINOR, OBSERVATION, QMS Related, etc.), visually look for an 'X' or checkmark. Note that the Date is sometimes written in the top right corner if the 'Date:' field is blank. Look for signatures over the printed names.

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
}"""

        response = local_ai_client.chat.completions.create(
            model="llama3.2-vision",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": f"{system_prompt}\\n\\nPlease extract the data from this image."
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ]
                }
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        result_json = response.choices[0].message.content
        import json
        parsed = json.loads(result_json)
        return parsed
    except HTTPException:
        raise
    except Exception as e:
        print(f"[extract_car_form] Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to extract data from the CAR form.")'''

content = re.sub(pattern, new_func, content, flags=re.DOTALL)

with open(r"c:\Projects\rag-governance\backend\main.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched main.py with llama3.2-vision support for extract_car_form")
