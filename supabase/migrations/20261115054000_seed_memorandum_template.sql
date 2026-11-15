-- Seed the controlled memorandum as a non-RAG repository template.
insert into public.document_sections (content, metadata, embedding)
select '', jsonb_build_object(
  'name', 'Official Memorandum Template',
  'category', 'Forms / Templates',
  'office', 'Campus Administration',
  'program', 'GLOBAL',
  'version', '1.0',
  'status', 'Active',
  'scope_type', 'CAMPUS',
  'scope_code', 'ARGAO',
  'template_code', 'MEMORANDUM',
  'template_revision', '1',
  'page_size', 'short',
  'orientation', 'portrait',
  'original_filename', 'Official Memorandum Template.html',
  'content_html', $memo$<!doctype html><html><head><style>@page{size:8.5in 11in;margin:18mm}body{margin:0;font:11pt Arial;line-height:1.45;color:#000}.page{min-height:9.5in}.office{font-weight:700;border-bottom:2px solid #000;padding-bottom:6px}.title{text-align:center;font-size:14pt;font-weight:700;letter-spacing:1px;margin:28px}.meta{width:100%;border-collapse:collapse}.meta td{padding:6px 4px;vertical-align:top}.label{font-weight:700;width:16%}.recipient-item{margin-bottom:4px}.subject{font-weight:700;border-bottom:2px solid #000;margin:22px 0;padding-bottom:5px}.body{min-height:260px;text-align:justify;white-space:normal}.signature{margin-top:45px}.signature strong{display:block}</style></head><body><div class="page"><div class="office">[SENDER OFFICE]</div><div class="title">MEMORANDUM</div><table class="meta"><tr><td class="label">DATE</td><td>[Date]</td></tr><tr><td class="label">MEMO NO.</td><td>[Memorandum Number], Series [Current Year]</td></tr><tr><td class="label">FROM</td><td><strong>[Sender Name]</strong><br>[Sender Title]</td></tr><tr><td class="label">TO</td><td>[Recipient Rows]</td></tr></table><div class="subject">SUBJECT: [SUBJECT]</div><div class="body">[Memo Body]</div><div class="signature"><strong>[SENDER NAME]</strong><span>[Sender Title]</span></div></div></body></html>$memo$
), null
where not exists (
  select 1 from public.document_sections
  where metadata->>'name' = 'Official Memorandum Template'
    and coalesce(metadata->>'status', 'Active') <> 'Archived'
);
