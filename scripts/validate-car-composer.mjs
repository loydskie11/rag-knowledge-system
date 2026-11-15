import assert from "node:assert/strict";
import fs from "node:fs";
import { CAR_FORM_1_SCHEMA, mapCarReportToTemplate } from "../src/app/features/document-composer/carForm1.ts";
import { escapeHtml } from "../src/app/features/document-composer/templateSecurity.ts";

const record = (overrides = {}) => ({
  id: "11111111-1111-1111-1111-111111111111",
  car_no: "CTU-CAR-2026-0001",
  date_issued: "2026-11-15",
  revision: "3",
  finding_category: "MINOR",
  type_of_non_conformity: "QMS Related",
  auditor_name: "QA Reviewer",
  acknowledged_by_name: "Office Head",
  campus: "Argao Campus",
  area: "Library Office",
  responsible_office: "Library Office",
  findings: "Required record was unavailable.",
  immediate_action: "Record located and secured.",
  root_cause: "The filing index was outdated.",
  corrective_measure: "Update and review the filing index monthly.",
  measures_proposed_by: "Office Head",
  target_date: "2026-11-30",
  status: "Issued",
  ...overrides,
});

const payload = (car, actions = []) => ({ car, actions, report_generated_at: "2026-11-15T12:00:00Z", report_generated_by: "QA Reviewer" });

const blank = mapCarReportToTemplate(payload({ id: "blank", status: "Issued" }));
assert.equal(blank.CAR_NO, "");
assert.equal(blank.CHECK_MAJOR, false);

const partial = mapCarReportToTemplate(payload(record({ finding_category: "OBSERVATION", acknowledged_by_name: undefined })));
assert.equal(partial.CHECK_OBS, true);
assert.equal(partial.CHECK_MINOR, false);

const closed = mapCarReportToTemplate(payload(record({
  status: "Closed",
  non_conformity_closed: true,
  effectiveness_outcome: "EFFECTIVE",
  follow_up_date: "2026-12-01",
  comments_remarks: "Implementation verified.",
})));
assert.equal(closed.STATUS_CLOSED, true);
assert.equal(closed.CHECK_EFFECTIVE, true);
assert.equal(closed.CHECK_INEFFECTIVE, false);

const longText = "Long corrective narrative ".repeat(300).trim();
const long = mapCarReportToTemplate(payload(record({ findings: longText, corrective_measure: longText })));
assert.equal(long.FINDINGS, longText);
assert.equal(long.CORRECTIVE_MEASURE, longText);

const special = `<script>alert("x")</script> & O'Reilly`;
const escaped = escapeHtml(special);
assert(!escaped.includes("<script>"));
assert(escaped.includes("&lt;script&gt;"));
assert(escaped.includes("&amp;"));

const actionMapped = mapCarReportToTemplate(payload(record({ corrective_measure: "", immediate_action: "", root_cause: "" }), [
  { corrective_measure: "Action A", immediate_action: "Immediate A", root_cause: "Cause A" },
  { corrective_measure: "Action B", immediate_action: "Immediate B", root_cause: "Cause B" },
]));
assert.match(String(actionMapped.CORRECTIVE_MEASURE), /1\. Action A/);
assert.match(String(actionMapped.CORRECTIVE_MEASURE), /2\. Action B/);

const controlledKeys = new Set(CAR_FORM_1_SCHEMA.fields.filter((field) => field.controlled).map((field) => field.key));
for (const key of ["CAR_NO", "REVISION", "DATE_ISSUED", "AREA", "FINDINGS", "STATUS_CLOSED"]) assert(controlledKeys.has(key));
for (const key of ["IMMEDIATE_ACTION", "ROOT_CAUSE", "CORRECTIVE_MEASURE"]) assert(!controlledKeys.has(key));

const migration = fs.readFileSync(new URL("../supabase/migrations/20261115040501_seed_car_form_1_template.sql", import.meta.url), "utf8");
const templateHtml = migration.match(/\$car_form_1\$([\s\S]*?)\$car_form_1\$/)?.[1] || "";
assert(templateHtml.length > 1000, "Seeded CAR template HTML is missing.");
const placeholders = [...new Set([...templateHtml.matchAll(/\[([A-Za-z0-9_ ,./&()-]+)\]/g)].map((match) => match[1]))];
const unsupported = placeholders.filter((placeholder) => !CAR_FORM_1_SCHEMA.allowedPlaceholders.includes(placeholder));
assert.deepEqual(unsupported, []);
assert.match(templateHtml, /@page\{size:8\.5in 11in/);

const accreditationSource = fs.readFileSync(new URL("../src/app/pages/AccreditationSupport.tsx", import.meta.url), "utf8");
assert(accreditationSource.includes("Generate form"));
assert(!accreditationSource.includes(">Legacy Export<"));

console.log("CAR composer validation passed: blank, partial, closed, long, special-character, action mapping, controls, template, and controlled workflow checks.");
