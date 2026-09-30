with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re

# Find start and end of handleExportCarForm
start_idx = content.find("  const handleExportCarForm = async (car: any) => {")
end_idx = content.find("  const [attachedCarFile, setAttachedCarFile] = useState<File | null>(null);", start_idx)

if start_idx != -1 and end_idx != -1:
    new_func = """  const handleExportCarForm = async (car: any) => {
    try {
      showToast("Generating official CAR Form 1...", "info");
  
      // 1. Fetch template HTML from repository
      const resp = await apiClient.get(`/documents/${encodeURIComponent("CAR Form 1 Template")}/content`);
      let html = resp.data?.content_html;
  
      if (!html || !html.trim()) {
        throw new Error("Master 'CAR Form 1 Template' not found in the Knowledge Repository. Please upload it first.");
      }
  
      // 2. Map standard text fields
      const textReplacements: Record<string, string> = {
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
      };
  
      for (const [placeholder, val] of Object.entries(textReplacements)) {
        html = html.split(placeholder).join(val);
      }
  
      // 3. Map checkbox tokens to Unicode symbols
      const CHECKED = "\\u2611";
      const UNCHECKED = "\\u2610";
  
      const category = (car.finding_category || "").toUpperCase();
      html = html.split("[CHECK_MAJOR]").join(category === "MAJOR" ? CHECKED : UNCHECKED);
      html = html.split("[CHECK_MINOR]").join(category === "MINOR" ? CHECKED : UNCHECKED);
      html = html.split("[CHECK_OBS]").join(category === "OBSERVATION" ? CHECKED : UNCHECKED);
  
      const ncType = (car.type_of_non_conformity || "").toLowerCase();
      html = html.split("[CHECK_QMS]").join(ncType.includes("qms") ? CHECKED : UNCHECKED);
      html = html.split("[CHECK_SECURITY]").join(ncType.includes("security") ? CHECKED : UNCHECKED);
      html = html.split("[CHECK_FEEDBACK]").join(ncType.includes("feedback") ? CHECKED : UNCHECKED);
      html = html.split("[CHECK_COMPLAINT]").join(ncType.includes("complaint") ? CHECKED : UNCHECKED);
      html = html.split("[CHECK_OTHER]").join(ncType.includes("other") ? CHECKED : UNCHECKED);

      const fuResult = (car.follow_up_result || "").toLowerCase();
      html = html.split("[CHECK_EFFECTIVE]").join((fuResult.includes("effective") && !fuResult.includes("ineffective")) ? CHECKED : UNCHECKED);
      html = html.split("[CHECK_INEFFECTIVE]").join(fuResult.includes("ineffective") ? CHECKED : UNCHECKED);
  
      const isClosed = car.status === "Closed";
      html = html.split("[STATUS_CLOSED]").join(isClosed ? CHECKED : UNCHECKED);
      html = html.split("[FOLLOWUP_COMPLETE]").join(isClosed ? CHECKED : UNCHECKED);
      html = html.split("[FOLLOWUP_INEFFECTIVE]").join(UNCHECKED);
  
      // 4. Generate Downloadable HTML file
      const fullHtml = `<!DOCTYPE html>
      <html>
        <head>
          <title>CAR_${car.car_no || "Form_1"}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.35; color: #000; margin: 0; padding: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            td, th { border: 1px solid #000; padding: 5px 8px; vertical-align: top; font-size: 9.5pt; }
            .controlled-copy { text-align: center; font-weight: bold; font-size: 8pt; margin-top: 10px; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          ${html}
          <div class="controlled-copy">CONTROLLED COPY</div>
          <script>
            window.onload = () => { setTimeout(() => window.print(), 500); };
          </script>
        </body>
      </html>`;
  
      const blob = new Blob([fullHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CAR_Form_${car.car_no || "1"}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  
      showToast("Official CAR Form 1 downloaded successfully!", "success");
    } catch (err: any) {
      console.error("Export error:", err);
      showToast(err.message || "Failed to generate official CAR Form 1.", "error");
    }
  };

"""
    content = content[:start_idx] + new_func + content[end_idx:]
    with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced with file download logic!")
else:
    print("Indices not found")
