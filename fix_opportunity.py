import sys
import re

with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

pattern = r'// Combine all Header Metadata \+ Findings into the Opportunity Description box\s*const combinedOpportunity = `\[CAR No: \$\{data\.car_no \|\| \'N/A\'\} \| Date: \$\{data\.date \|\| \'N/A\'\} \| Rev: \$\{data\.revision \|\| \'N/A\'\}\]\\nCategory: \$\{data\.finding_category \|\| \'Unknown\'\} \| Type: \$\{nCTypeString\}\\nAuditor: \$\{data\.auditor_name \|\| \'N/A\'\} \| Acknowledged By: \$\{data\.acknowledged_by \|\| \'N/A\'\}\\nCampus: \$\{data\.campus \|\| \'N/A\'\} \| Area: \$\{data\.area \|\| \'N/A\'\}\\n\\nFINDINGS:\\n\$\{data\.findings \|\| \'No findings extracted\.\'\}\\n\\nROOT CAUSE:\\n\$\{data\.root_cause \|\| \'No root cause extracted\.\'\}`;\s*// Combine Actions\s*const combinedAction = `IMMEDIATE ACTION:\\n\$\{data\.immediate_action \|\| \'No immediate action extracted\.\'\}\\n\\nPROPOSED CORRECTIVE MEASURE:\\n\$\{data\.corrective_measure \|\| \'No corrective measure extracted\.\'\}`;'

replacement = """// Combine Header Metadata + Findings into Opportunity Description
                          const combinedOpportunity = `[CAR No: ${data.car_no || 'N/A'} | Date: ${data.date || 'N/A'} | Rev: ${data.revision || 'N/A'}]\\nCategory: ${data.finding_category || 'Unknown'} | Type: ${nCTypeString}\\nAuditor: ${data.auditor_name || 'N/A'} | Acknowledged By: ${data.acknowledged_by || 'N/A'}\\nCampus: ${data.campus || 'N/A'} | Area: ${data.area || 'N/A'}\\n\\nSTATEMENT/FINDING(S):\\n${data.findings || 'No findings extracted.'}`;

                          // Generate a structured template for the Auditee to fill out the remaining fields
                          const combinedAction = `ROOT CAUSE(S):\\n${data.root_cause || '[Type root cause analysis here]'}\\n\\nIMMEDIATE ACTION(S):\\n${data.immediate_action || '[Type immediate actions taken here]'}\\n\\nPROPOSED CORRECTIVE MEASURE(S):\\n${data.corrective_measure || '[Type long-term corrective measures here]'}`;"""

new_content = re.sub(pattern, replacement.replace('\\', '\\\\'), content)

if new_content != content:
    with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replaced frontend code successfully!")
else:
    print("Could not match the frontend pattern.")
