-- Seed the controlled CAR / PAR Form 3 master log as a non-RAG repository template.
insert into public.document_sections (content, metadata, embedding)
select
  '',
  jsonb_build_object(
    'name', 'CAR Form 3 Template',
    'category', 'Forms / Templates',
    'office', 'Quality Assurance Office',
    'program', 'GLOBAL',
    'version', '1.0',
    'status', 'Active',
    'scope_type', 'CAMPUS',
    'scope_code', 'ARGAO',
    'template_code', 'CAR_FORM_3',
    'template_revision', '0',
    'page_size', 'short',
    'orientation', 'landscape',
    'original_filename', 'CAR Form 3 Template.html',
    'content_html', $car_form_3$<!doctype html><html><head><style>
      @page{size:11in 8.5in;margin:10mm}
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:9px;margin:0;color:#000}
      .heading{text-align:center;margin-bottom:8px}.heading h1{font-size:14px;margin:0 0 3px}.meta{display:flex;justify-content:space-between;margin:6px 0;font-weight:700}
      table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tfoot{display:table-footer-group}
      th,td{border:1px solid #000;padding:4px;vertical-align:top;overflow-wrap:anywhere}th{text-align:center;background:#eee}tr{break-inside:avoid;page-break-inside:avoid}
      tbody tr{height:18px}.c1{width:12%}.c2{width:13%}.c3{width:20%}.c4{width:21%}.c5{width:20%}.c6{width:14%}
      @media print{body{margin:0}.heading{break-after:avoid}.master-log{break-before:avoid}}
    </style></head><body>
      <div class="heading"><h1>CEBU TECHNOLOGICAL UNIVERSITY – ARGAO CAMPUS</h1><strong>CORRECTIVE / PREVENTIVE ACTION REQUEST MASTER LOGSHEET (CAR FORM 3)</strong></div>
      <div class="meta"><span>Audit cycle: [CYCLE_YEAR]</span><span>Revision: 0</span></div>
      <table class="master-log"><thead><tr><th class="c1">CAR No.</th><th class="c2">Date Issued</th><th class="c3">Area</th><th class="c4">Responsible Office</th><th class="c5">Issued By</th><th class="c6">Status</th></tr></thead><tbody>[LOGSHEET_ROWS]</tbody></table>
    </body></html>$car_form_3$
  ),
  null
where not exists (
  select 1 from public.document_sections
  where metadata->>'name' = 'CAR Form 3 Template'
    and coalesce(metadata->>'status', 'Active') <> 'Archived'
);
