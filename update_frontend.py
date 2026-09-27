import sys
import re

with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

pattern = r'const res = await apiClient\.post\("/api/extract-car-form", formData\);\s*const data = res\.data;\s*const combinedOpportunity = `FINDINGS:\\n\$\{data\.findings\}\\n\\nROOT CAUSE:\\n\$\{data\.root_cause\}`;\s*const combinedAction = `IMMEDIATE ACTION:\\n\$\{data\.immediate_action\}\\n\\nPROPOSED CORRECTIVE MEASURE:\\n\$\{data\.corrective_measure\}`;\s*setNewQmsPlan\(\(prev:\s*any\)\s*=>\s*\(\{\s*\.\.\.prev,\s*opportunity_type:\s*"Process",\s*opportunity_description:\s*combinedOpportunity\.trim\(\),\s*action_plan:\s*combinedAction\.trim\(\)\s*\}\)\);'

replacement = """const res = await apiClient.post("/api/extract-car-form", formData);
                          const data = res.data;
                          
                          // Format Type of Non-Conformity tags
                          const typeTags = [];
                          if (data.type_of_non_conformity?.qms_related) typeTags.push("QMS Related");
                          if (data.type_of_non_conformity?.security_related) typeTags.push("Security Related");
                          if (data.type_of_non_conformity?.customer_feedback) typeTags.push("Customer Feedback");
                          if (data.type_of_non_conformity?.customer_complaint) typeTags.push("Customer Complaint");
                          if (data.type_of_non_conformity?.other) typeTags.push(`Other: ${data.type_of_non_conformity.other}`);
                          const nCTypeString = typeTags.length > 0 ? typeTags.join(", ") : "Not Specified";

                          // Combine all Header Metadata + Findings into the Opportunity Description box
                          const combinedOpportunity = `[CAR No: ${data.car_no || 'N/A'} | Date: ${data.date || 'N/A'} | Rev: ${data.revision || 'N/A'}]\\nCategory: ${data.finding_category || 'Unknown'} | Type: ${nCTypeString}\\nAuditor: ${data.auditor_name || 'N/A'} | Acknowledged By: ${data.acknowledged_by || 'N/A'}\\nCampus: ${data.campus || 'N/A'} | Area: ${data.area || 'N/A'}\\n\\nFINDINGS:\\n${data.findings || 'No findings extracted.'}\\n\\nROOT CAUSE:\\n${data.root_cause || 'No root cause extracted.'}`;

                          // Combine Actions
                          const combinedAction = `IMMEDIATE ACTION:\\n${data.immediate_action || 'No immediate action extracted.'}\\n\\nPROPOSED CORRECTIVE MEASURE:\\n${data.corrective_measure || 'No corrective measure extracted.'}`;
                          
                          setNewQmsPlan((prev: any) => ({
                            ...prev,
                            opportunity_type: data.type_of_non_conformity?.qms_related ? "Process" : "Risk/Opportunity",
                            opportunity_description: combinedOpportunity.trim(),
                            action_plan: combinedAction.trim()
                          }));"""

new_content = re.sub(pattern, replacement.replace('\\', '\\\\'), content)

if new_content != content:
    with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replaced frontend code successfully!")
else:
    print("Could not match the frontend pattern.")
