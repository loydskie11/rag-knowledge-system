-- Seed the approved CAR Form 1 HTML as a non-RAG repository template.
-- Idempotent by logical document name and active status.
insert into public.document_sections (content, metadata, embedding)
select
  '',
  jsonb_build_object(
    'name', 'CAR Form 1 Template',
    'category', 'Forms / Templates',
    'office', 'Quality Assurance Office',
    'program', 'GLOBAL',
    'version', '1.0',
    'effectivity_date', '2024-08-01',
    'status', 'Active',
    'scope_type', 'CAMPUS',
    'scope_code', 'ARGAO',
    'template_code', 'CAR_FORM_1',
    'template_revision', '3',
    'page_size', 'short',
    'orientation', 'portrait',
    'line_spacing', '1.3',
    'original_filename', 'CAR Form 1 Template.html',
    'content_html', $car_form_1$<html><head><style>body{font-family:'Times New Roman',Times,serif;font-size:12px;margin:0;padding:20px;line-height:1.3}table{width:100%;border-collapse:collapse;margin-bottom:20px;table-layout:fixed}th,td{border:1px solid #000;padding:6px 8px;vertical-align:top}.header-table td{text-align:left}.title{font-weight:bold;text-align:center;font-size:14px}.center{text-align:center}.bold{font-weight:bold}.signature-line{border-bottom:1px solid #000;width:80%;margin:10px auto 0;text-align:center}@page{size:8.5in 11in;margin:12mm}@media print{body{padding:0}}</style></head><body><div style="text-align:left;font-weight:bold;margin-bottom:10px">CEBU TECHNOLOGICAL UNIVERSITY</div><table class="header-table" style="border:none"><tr style="border:none"><td style="border:none;width:20%"></td><td style="border:none;width:60%" class="center"><div class="title">CORRECTIVE ACTION REQUEST (CAR) FORM 1</div><div>CAR No. <span class="bold">[CAR_NO]</span></div></td><td style="border:none;width:20%;font-size:10px;text-align:right"><div>Date: [DATE_ISSUED]</div><div>Revision: [REVISION]</div></td></tr></table><table><tr><td colspan="2">Campus: <span class="bold">[CAMPUS]</span></td><td colspan="2">Date: <span class="bold">[DATE_ISSUED]</span></td></tr><tr><td colspan="4" style="height:100px"><span class="bold">Statement/Finding(s):</span><div style="text-align:right">Area: <span style="text-decoration:underline">[AREA]</span></div><div style="margin-top:10px">[FINDINGS]</div></td></tr><tr class="center"><td>[CHECK_MAJOR] MAJOR</td><td>[CHECK_MINOR] MINOR</td><td colspan="2">[CHECK_OBS] OBSERVATION</td></tr><tr><td colspan="2" style="height:60px;text-align:center"><div>Auditor/Complainant:</div><div class="signature-line">[AUDITOR]</div><div style="font-size:10px">(Signature over printed name and date)</div></td><td colspan="2" style="height:60px;text-align:center"><div>Acknowledged by:</div><div class="signature-line">[ACKNOWLEDGED_BY]</div><div style="font-size:10px">(Signature over printed name and date)</div></td></tr><tr><td colspan="4"><span class="bold">Type of Non-Conformity:</span><br><table style="border:none;margin-top:5px"><tr style="border:none"><td style="border:none">[CHECK_QMS] QMS Related</td><td style="border:none">[CHECK_SECURITY] Security Related</td><td style="border:none">[CHECK_FEEDBACK] Customer Feedback</td></tr><tr style="border:none"><td style="border:none">[CHECK_OTHER] Other Types: <u>[OTHER_DESC]</u></td><td style="border:none"></td><td style="border:none">[CHECK_COMPLAINT] Customer Complaint</td></tr></table></td></tr><tr><td colspan="4" style="height:60px"><span class="bold">Immediate Action(s):</span><br>[IMMEDIATE_ACTION]</td></tr><tr><td colspan="4" style="height:60px"><span class="bold">Non-Conformity Root Cause(s):</span><br>[ROOT_CAUSE]</td></tr><tr><td colspan="4" style="height:60px"><span class="bold">Proposed Corrective Measure(s):</span><br>[CORRECTIVE_MEASURE]</td></tr><tr><td colspan="2" style="height:60px;text-align:center"><div>Measure(s) Proposed By:</div><div class="signature-line">[PROPOSED_BY]</div><div style="font-size:10px">(Signature over printed name)</div></td><td colspan="2" style="height:60px;text-align:center"><div>Target Date of Full Implementation and Follow up Action:</div><div style="font-weight:bold;margin-top:10px">[TARGET_DATE]</div></td></tr><tr><td colspan="4"><span class="bold">Follow Up Action Results:</span><br>[CHECK_EFFECTIVE] Measures complete and effective<br>[CHECK_INEFFECTIVE] Measures ineffective &amp; for re-follow up on: <u>[FOLLOWUP_DATE]</u></td></tr><tr><td colspan="4" style="height:60px"><span class="bold">Comments/Remarks:</span><br>[REMARKS]</td></tr></table></body></html>$car_form_1$
  ),
  null
where not exists (
  select 1
  from public.document_sections
  where metadata->>'name' = 'CAR Form 1 Template'
    and coalesce(metadata->>'status', 'Active') <> 'Archived'
);

