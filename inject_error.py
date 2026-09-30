import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_catch = """    } catch (err: any) {
      console.error("Export error:", err);
      showToast(err.message || "Failed to generate official CAR Form 1.", "error");
    }"""

new_catch = """    } catch (err: any) {
      console.error("Export error:", err);
      if (printWindow) {
        printWindow.document.body.innerHTML = "<h2 style='color:red;'>Generation Failed</h2><pre>" + (err.message || String(err)) + "</pre>";
      }
      showToast(err.message || "Failed to generate official CAR Form 1.", "error");
    }"""

if old_catch in content:
    content = content.replace(old_catch, new_catch)
    with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Injected error display into print window.")
else:
    print("Catch block not found.")

