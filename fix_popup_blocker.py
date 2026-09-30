import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix the tags
content = content.replace('"[CAT_MAJOR]"', '"[CHECK_MAJOR]"')
content = content.replace('"[CAT_MINOR]"', '"[CHECK_MINOR]"')
content = content.replace('"[CAT_OBSERVATION]"', '"[CHECK_OBS]"')
content = content.replace('"[TYPE_QMS]"', '"[CHECK_QMS]"')
content = content.replace('"[TYPE_SECURITY]"', '"[CHECK_SECURITY]"')
content = content.replace('"[TYPE_FEEDBACK]"', '"[CHECK_FEEDBACK]"')
content = content.replace('"[TYPE_COMPLAINT]"', '"[CHECK_COMPLAINT]"')
content = content.replace('"[TYPE_OTHER]"', '"[CHECK_OTHER]"')

# Fix the async popup blocker issue
old_logic = """  const handleExportCarForm = async (car: any) => {
    try {
      showToast("Generating official CAR Form 1...", "info");
  
      // 1. Fetch template HTML from repository
      const resp = await apiClient.get(`/documents/${encodeURIComponent("CAR Form 1 Template")}/content`);"""

new_logic = """  const handleExportCarForm = async (car: any) => {
    // Open native Print/PDF dialog synchronously to bypass browser pop-up blockers
    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (!printWindow) {
      showToast("Please allow pop-ups to export or print the document.", "error");
      return;
    }
    printWindow.document.write("<html><body style='font-family:sans-serif; padding: 2rem; text-align: center;'><h2>Generating Official Document...</h2><p>Please wait while we assemble the CAR Form.</p></body></html>");

    try {
      showToast("Generating official CAR Form 1...", "info");
  
      // 1. Fetch template HTML from repository
      const resp = await apiClient.get(`/documents/${encodeURIComponent("CAR Form 1 Template")}/content`);"""

content = content.replace(old_logic, new_logic)

old_popup = """      // 4. Open native Print/PDF dialog with official document styling
      const printWindow = window.open("", "_blank", "width=900,height=800");
      if (!printWindow) {
        showToast("Please allow pop-ups to export or print the document.", "error");
        return;
      }
  
      printWindow.document.write(`<!DOCTYPE html>"""

new_popup = """      // 4. Print official document styling
      printWindow.document.open();
      printWindow.document.write(`<!DOCTYPE html>"""

content = content.replace(old_popup, new_popup)

# And fix the catch block to close the window if error
old_catch = """      } catch (error: any) {
        showToast(error.response?.data?.detail || error.message || "Failed to generate CAR form.", "error");
      }
    };"""

new_catch = """      } catch (error: any) {
        if (printWindow) printWindow.close();
        showToast(error.response?.data?.detail || error.message || "Failed to generate CAR form.", "error");
      }
    };"""
content = content.replace(old_catch, new_catch)

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Popup blocker bypass and tag fixes applied!")
