import sys

with open('src/app/pages/AccreditationSupport.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add exportMrcForm6 import at the top
import_str = 'import { exportMrcForm6 } from "../utils/mrcFormsExporter";\n'
if import_str not in text:
    idx = text.find('import {')
    text = text[:idx] + import_str + text[idx:]

# 2. Add handleExportMrcForm6 to main component
mrc_export_fn = """
  const handleExportMrcForm6 = async () => {
    try {
      if (!qmsActionPlans || qmsActionPlans.length === 0) {
        throw new Error("No QMS Action Plans available to export for this cycle.");
      }
      
      const rows = qmsActionPlans.map((plan: any) => ({
        opportunity: plan.opportunity_type || "",
        action_plan: plan.corrective_measure || plan.immediate_action || plan.findings || "",
        target_date: plan.target_date || "",
        persons_responsible: plan.personnel_responsible || plan.auditee_name || "",
        date_of_assessment: plan.created_at ? new Date(plan.created_at).toLocaleDateString() : "",
        date_of_completion: plan.status === 'Completed' && plan.updated_at ? new Date(plan.updated_at).toLocaleDateString() : ""
      }));

      await exportMrcForm6(
        {
          unit_name: "CTU Argao Campus - All Units", // Or pass specific unit if filtering
          prepared_by: sessionStorage.getItem('userName') || "IQA Chair",
          reviewed_by: "Campus Director",
          approved_by: "Campus Director",
          rows: rows
        },
        navigate,
        showToast
      );
    } catch (err: any) {
      console.error("handleExportMrcForm6 error:", err);
      showToast(err.message || "Failed to export MRC Form 6.", "error");
    }
  };
"""
idx = text.find('const [attachedCarFile, setAttachedCarFile] = useState<File | null>(null);')
if 'handleExportMrcForm6 = async' not in text:
    text = text[:idx] + mrc_export_fn + text[idx:]

# 3. Add to IsoTabContent props list
if 'handleExportMrcForm6,' not in text:
    idx = text.find('handleExportCarForm3,')
    text = text[:idx] + 'handleExportCarForm3,\n  handleExportMrcForm6,' + text[idx+len('handleExportCarForm3,'):]

# 4. Pass down to IsoTabContent
if 'handleExportMrcForm6={handleExportMrcForm6}' not in text:
    idx = text.find('handleExportCarForm3={handleExportCarForm3}')
    text = text[:idx] + 'handleExportCarForm3={handleExportCarForm3}\n            handleExportMrcForm6={handleExportMrcForm6}' + text[idx+len('handleExportCarForm3={handleExportCarForm3}'):]


# 5. Add buttons for Export MRC Form 6
buttons_str = """
                          <button
                            onClick={handleExportMrcForm6}
                            className="px-3 py-2 bg-white hover:bg-emerald-50/50 text-gray-700 hover:text-emerald-700 rounded-lg text-xs font-medium transition-all border border-gray-300 hover:border-emerald-500/40 shadow-2xs flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
                            title="Generate Action Plan (MRC Form 6)"
                          >
                            <Printer className="h-3.5 w-3.5 text-emerald-600" /> MRC Form 6
                          </button>
"""
target_btn = '<Printer className="h-3.5 w-3.5" /> Export Logsheet\n                          </button>'
if 'MRC Form 6' not in text:
    idx = text.find(target_btn)
    text = text[:idx+len(target_btn)] + '\n' + buttons_str + text[idx+len(target_btn):]

with open('src/app/pages/AccreditationSupport.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done")
