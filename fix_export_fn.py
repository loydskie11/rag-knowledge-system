import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

func_code = """  const handleDeleteCarSubmit = async () => {
    if (!carFormToDelete) return;
    setIsDeletingCar(true);
    try {
      await apiClient.delete(`/car-forms/${carFormToDelete.id}`);
      showToast("CAR Form deleted.", "success");
      setShowDeleteCarModal(false);
      setCarFormToDelete(null);
      fetchCarForms(selectedIsoCycleYear);
    } catch (error) {
      showToast("Failed to delete CAR Form.", "error");
    } finally {
      setIsDeletingCar(false);
    }
  };

  const handleExportCarForm = async (car: any) => {
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
      const CHECKED = "☑";
      const UNCHECKED = "☐";
  
      const category = (car.finding_category || "").toUpperCase();
      html = html.split("[CAT_MAJOR]").join(category === "MAJOR" ? CHECKED : UNCHECKED);
      html = html.split("[CAT_MINOR]").join(category === "MINOR" ? CHECKED : UNCHECKED);
      html = html.split("[CAT_OBSERVATION]").join(category === "OBSERVATION" ? CHECKED : UNCHECKED);
  
      const ncType = (car.type_of_non_conformity || "").toLowerCase();
      html = html.split("[TYPE_QMS]").join(ncType.includes("qms") ? CHECKED : UNCHECKED);
      html = html.split("[TYPE_SECURITY]").join(ncType.includes("security") ? CHECKED : UNCHECKED);
      html = html.split("[TYPE_FEEDBACK]").join(ncType.includes("feedback") ? CHECKED : UNCHECKED);
      html = html.split("[TYPE_COMPLAINT]").join(ncType.includes("complaint") ? CHECKED : UNCHECKED);
      html = html.split("[TYPE_OTHER]").join(ncType.includes("other") ? CHECKED : UNCHECKED);
  
      const isClosed = car.status === "Closed";
      html = html.split("[STATUS_CLOSED]").join(isClosed ? CHECKED : UNCHECKED);
      html = html.split("[FOLLOWUP_COMPLETE]").join(isClosed ? CHECKED : UNCHECKED);
      html = html.split("[FOLLOWUP_INEFFECTIVE]").join(UNCHECKED);
  
      // 4. Open native Print/PDF dialog with official document styling
      const printWindow = window.open("", "_blank", "width=900,height=800");
      if (!printWindow) {
        showToast("Please allow pop-ups to export or print the document.", "error");
        return;
      }
  
      printWindow.document.write(`<!DOCTYPE html>
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
        </body>
      </html>`);
  
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
  
      showToast("Official CAR Form 1 generated successfully!", "success");
    } catch (err: any) {
      console.error("Export error:", err);
      showToast(err.message || "Failed to generate official CAR Form 1.", "error");
    }
  };"""

content = re.sub(
    r'  const handleDeleteCarSubmit = async \(\) => \{.*?\n    \}\n  \};\n',
    func_code + '\n',
    content,
    flags=re.DOTALL
)

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Export function injected.")
