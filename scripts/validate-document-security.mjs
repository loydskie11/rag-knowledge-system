import fs from "node:fs";

const backend = fs.readFileSync("backend/main.py", "utf8");
const frontendSecurity = fs.readFileSync("src/app/features/document-composer/templateSecurity.ts", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261115055000_generated_document_lifecycle.sql", "utf8").toLowerCase();

const checks = [
  ["generated documents require authenticated personnel", backend.includes('Depends(get_current_faculty_or_admin)') && backend.includes('@app.post("/generated-documents", status_code=201)')],
  ["generated documents are owner scoped", backend.includes("def require_generated_document_access") && backend.includes("record.created_by_id != current_user.id")],
  ["active template identity is verified", backend.includes("def require_active_template_access") && backend.includes("payload.template_name, payload.template_code, payload.template_version")],
  ["template management is server authorized", backend.includes("def require_template_manager") && backend.includes("can_manage_templates(current_user)")],
  ["inactive templates are hidden from ordinary users", backend.includes('meta.get("category") == "Forms / Templates"') && backend.includes('not can_manage_templates(current_user)')],
  ["source records are server scoped", backend.includes("def validate_generated_document_source") && backend.includes("require_office(current_user, car_office(car, db))")],
  ["rendered HTML is checked on create and update", (backend.match(/validate_safe_generated_html\(payload\.rendered_html\)/g) || []).length >= 2],
  ["normal template uploads remain drafts", backend.includes('metadata["template_management_required"] = True') && backend.includes('metadata["status"] = "Draft"')],
  ["inserted values are escaped", frontendSecurity.includes("export function escapeHtml") && frontendSecurity.includes("const replacement = escapeHtml(scalar)")],
  ["scripts and event handlers are blocked", backend.includes('r"\\son[a-z]+\\s*="') && backend.includes("script|iframe|frame|object")],
  ["external resources are blocked", backend.includes("external_urls = re.findall") && frontendSecurity.includes("default-src 'none'")],
  ["database tables have RLS", migration.includes("alter table public.generated_documents enable row level security") && migration.includes("alter table public.generated_document_events enable row level security")],
];

const failures = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
if (failures.length) {
  console.error(`\n${failures.length} Phase 11 security validation check(s) failed.`);
  process.exit(1);
}
console.log("\nPhase 11 document security validation passed.");
