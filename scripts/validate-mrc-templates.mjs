import assert from "node:assert/strict";
import fs from "node:fs";
const migration = fs.readFileSync(new URL("../supabase/migrations/20261115050000_seed_mrc_templates.sql", import.meta.url), "utf8");
const schemaSource = fs.readFileSync(new URL("../src/app/features/document-composer/templateSchemas.ts", import.meta.url), "utf8");
const expected = [
  ["MRC_FORM_2", "MRC Form 2 Template", "portrait", "MANAGEMENT REVIEW MEETING MINUTES", 0],
  ["MRC_FORM_3", "MRC Form 3 Template", "landscape", "SHORT, MEDIUM, AND LONG TERM PLAN", 8],
  ["MRC_FORM_4", "MRC Form 4 Template", "landscape", "ANNUAL PLAN", 9],
  ["MRC_FORM_5", "MRC Form 5 Template", "landscape", "RISK IDENTIFICATION", 10],
  ["MRC_FORM_6", "MRC Form 6 Template", "landscape", "OPPORTUNITIES IDENTIFICATION", 6],
  ["MRC_FORM_7", "MRC Form 7 Template", "landscape", "RELEVANT ISSUES LOG", 8],
];

for (const [code, name, orientation, title, columnCount] of expected) {
  assert(schemaSource.includes(`code: "${code}"`), `${code} schema is missing.`);
  assert(schemaSource.includes(`repositoryNames: ["${name.replace(" Template", "")}`) || schemaSource.includes(name));
  assert(migration.includes(`'${name}','${code}'`));
  assert(migration.includes(`'${orientation}'`));
  assert(migration.includes(title));
  assert(migration.includes("CEBU TECHNOLOGICAL UNIVERSITY"));
  if (columnCount > 0) assert(migration.includes("[LOGSHEET_ROWS]"));
}

assert(migration.includes("thead{display:table-header-group}"));
assert(migration.includes("break-inside:avoid"));
assert(migration.includes("Prepared by"));
assert(migration.includes("Approved by"));

console.log("MRC template validation passed: Forms 2-7 schemas, orientations, repeating rows, official headings, signatories, and print rules.");
