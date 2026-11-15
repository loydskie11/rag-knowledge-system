import fs from "node:fs";

const routes = fs.readFileSync("src/app/routes.tsx", "utf8");
const layout = fs.readFileSync("src/app/layouts/DashboardLayout.tsx", "utf8");
const permissions = fs.readFileSync("src/app/utils/rolePermissions.ts", "utf8");
const composer = fs.readFileSync("src/app/pages/TemplateDocumentComposer.tsx", "utf8");
const exporter = fs.readFileSync("src/app/utils/mrcFormsExporter.ts", "utf8");
const accreditation = fs.readFileSync("src/app/pages/AccreditationSupport.tsx", "utf8");
const backend = fs.readFileSync("backend/main.py", "utf8");

const migratedCodes = ["MEMORANDUM", "CAR_FORM_1", "CAR_FORM_3", "MRC_FORM_2", "MRC_FORM_3", "MRC_FORM_4", "MRC_FORM_5", "MRC_FORM_6", "MRC_FORM_7"];
const checks = [
  ["controlled generator is the sidebar default", layout.includes('path: "/app/document-composer"') && layout.includes('label: "Document Generator"')],
  ["accessible route helper points to composer", permissions.includes('["canAccessDocumentGenerator", "/app/document-composer"]')],
  ["legacy editor is System Administrator only", routes.includes('allowedRoles={["SYSTEM_ADMIN"]}')],
  ["legacy fallback use is audited", backend.includes('@app.post("/legacy-document-editor/usage")') && backend.includes("Legacy Document Editor Fallback")],
  ["MRC exports use controlled composer", !exporter.includes('navigate("/app/document-generator"') && (exporter.match(/navigate\("\/app\/document-composer"/g) || []).length === 5],
  ["CAR duplicate legacy controls removed", !accreditation.includes(">Legacy Export<") && !accreditation.includes(">New Composer<")],
  ["routed draft values load into composer", composer.includes("composerValues") && composer.includes("routedDraftLoaded")],
  ["user-centered generator heading", composer.includes(">Document Generator<") && composer.includes("Choose an approved form")],
  ["save, finalize, reopen, and print remain available", ["saveDraft", "finalizeDocument", "reopenDocument", "printDocument"].every((value) => composer.includes(value))],
  ["all migrated template codes remain registered", migratedCodes.every((code) => composer.includes(code) || fs.readFileSync("src/app/features/document-composer/templateSchemas.ts", "utf8").includes(code))],
];

const failures = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
if (failures.length) {
  console.error(`\n${failures.length} Phase 12 acceptance check(s) failed.`);
  process.exit(1);
}
console.log("\nPhase 12 internal acceptance validation passed.");
