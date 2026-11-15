import assert from "node:assert/strict";
import fs from "node:fs";

const schema = fs.readFileSync(new URL("../src/app/features/document-composer/templateSchemas.ts", import.meta.url), "utf8");
const security = fs.readFileSync(new URL("../src/app/features/document-composer/templateSecurity.ts", import.meta.url), "utf8");
const composer = fs.readFileSync(new URL("../src/app/pages/TemplateDocumentComposer.tsx", import.meta.url), "utf8");
const migration = fs.readFileSync(new URL("../supabase/migrations/20261115054000_seed_memorandum_template.sql", import.meta.url), "utf8");

for (const token of ["SENDER OFFICE", "Date", "Memorandum Number", "Current Year", "Sender Name", "Sender Title", "Recipient Rows", "SUBJECT", "Memo Body", "SENDER NAME"]) assert(migration.includes(`[${token}]`), `Missing memorandum placeholder [${token}].`);
assert(schema.includes('rowTemplate: \'<div class="recipient-item"'));
assert(schema.includes('text("SENDER OFFICE", "Sender office", true, true)'));
assert(schema.includes('controlled: true, placeholders: ["[Sender Name]", "[SENDER NAME]"]'));
assert(security.includes("addLetterheadImages"));
assert(security.includes("position:fixed"));
assert(composer.includes("Upload header"));
assert(composer.includes("Upload footer"));
assert(composer.includes("AI-generated draft — human review required"));
assert(composer.includes('/generate-document'));
assert(!security.includes("allow-scripts"));

console.log("Memorandum composer validation passed: structured recipients, controlled sender, optional reviewed AI drafting, and printable header/footer images.");
