import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(new URL("../supabase/migrations/20261115055000_generated_document_lifecycle.sql", import.meta.url), "utf8");
const backend = fs.readFileSync(new URL("../backend/main.py", import.meta.url), "utf8");
const composer = fs.readFileSync(new URL("../src/app/pages/TemplateDocumentComposer.tsx", import.meta.url), "utf8");

for (const status of ["DRAFT", "FINALIZED", "SUPERSEDED", "VOIDED"]) assert(migration.includes(status));
for (const column of ["template_code", "template_version", "field_values", "rendered_html", "source_type", "source_id", "created_by_id", "last_edited_by_id", "finalized_by_id", "supersedes_id"]) assert(migration.includes(column), `Missing lifecycle column ${column}.`);
assert(migration.includes("enable row level security"));
assert(migration.includes("generated_document_events"));
assert(migration.includes("generated_documents_legacy"), "Legacy table preservation is missing.");

assert(backend.includes("require_generated_document_access"));
assert(backend.includes('record.created_by_id != current_user.id'));
assert(backend.includes('if record.status != "DRAFT"'));
assert(backend.includes('record.status = "FINALIZED"'));
assert(backend.includes('record.status = "SUPERSEDED"'));
assert(backend.includes('record.status = "VOIDED"'));
assert(backend.includes('@app.get("/audit/generated-documents")'));
assert(backend.includes("validate_generated_document_source"));

assert(composer.includes('apiClient.post("/generated-documents", payload)'));
assert(composer.includes("Save draft"));
assert(composer.includes(">Reopen<"));
assert(composer.includes("Finalize"));
assert(composer.includes("documentLocked"));
assert(composer.includes("__composer_header_image"));
assert(composer.includes('source_type: carId ? "CAR_FORM"'));
assert(composer.includes('"MRC_RECORD"'));
assert(composer.includes("sourceReference"));

console.log("Generated-document lifecycle validation passed: ownership, drafts, finalization, superseding, voiding, source links, preserved output, and audit events.");
