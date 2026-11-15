import fs from "node:fs";

const backend = fs.readFileSync("backend/main.py", "utf8");
const composer = fs.readFileSync("src/app/pages/TemplateDocumentComposer.tsx", "utf8");

const checks = [
  ["management authorization", backend.includes("def require_template_manager") && backend.includes('DOCUMENT_CONTROLLER')],
  ["backend HTML validation", backend.includes("def validate_template_html") && backend.includes("UNSAFE_TEMPLATE_PATTERNS")],
  ["template validation endpoint", backend.includes('@app.post("/document-templates/validate")')],
  ["version creation endpoint", backend.includes('@app.post("/document-templates", status_code=201)')],
  ["activation endpoint", backend.includes('@app.post("/document-templates/{section_id}/activate")')],
  ["archive endpoint", backend.includes('@app.post("/document-templates/{section_id}/archive")')],
  ["active version superseding", backend.includes('active_meta["status"] = "Superseded"')],
  ["finalized-document version protection", backend.includes('models.GeneratedDocument.status.in_(["FINALIZED", "SUPERSEDED"])')],
  ["manager interface", composer.includes("Manage approved templates") && composer.includes("Save as draft")],
  ["preview required before activation", composer.includes("previewedTemplateId !== template.id")],
  ["normal composer excludes inactive templates", composer.includes('item.status === "Active"')],
  ["compact neutral document actions", composer.includes('grid w-full grid-cols-3 gap-2') && composer.includes('inline-flex h-9 min-w-0 items-center justify-center') && !composer.includes('focus:border-orange-500')],
  ["guided new document type flow", composer.includes('New document type') && composer.includes('Detected fields') && composer.includes('extractTemplatePlaceholders')],
  ["dynamic field schema validation", backend.includes('def validate_dynamic_field_schema') && backend.includes('field_schema: Optional[List[Dict[str, Any]]]')],
  ["dynamic schemas are persisted", backend.includes('"field_schema": validation.get("field_schema") or payload.field_schema')],
  ["Word and PDF template import", backend.includes('@app.post("/document-templates/convert")') && backend.includes("docx_to_html_with_assets(contents)") && backend.includes("pdf_to_html(contents)")],
  ["converted templates remain reviewable drafts", composer.includes("Word (.docx) is recommended") && composer.includes("templateConversionWarnings") && composer.includes("Check and preview")],
];

const failures = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);

if (failures.length) {
  console.error(`\n${failures.length} Phase 9 validation check(s) failed.`);
  process.exit(1);
}

console.log("\nPhase 9 template-management validation passed.");
