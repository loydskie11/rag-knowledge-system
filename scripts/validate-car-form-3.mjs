import assert from "node:assert/strict";
import fs from "node:fs";
import { CAR_FORM_3_SCHEMA, mapCarMasterLogToTemplate } from "../src/app/features/document-composer/carForm3.ts";

const empty = mapCarMasterLogToTemplate("2026 Recertification", []);
assert.equal(empty.CYCLE_YEAR, "2026 Recertification");
assert.equal(empty.LOGSHEET_ROWS.length, 0);

const short = mapCarMasterLogToTemplate("2026", [{ id: "1", car_no: "07-C001", date_issued: "2026-01-03", area: "Library", responsible_office: "Library Office", issued_by: "QA Head", status: "Issued" }]);
assert.equal(short.LOGSHEET_ROWS.length, 1);
assert.equal(short.LOGSHEET_ROWS[0].car_no, "07-C001");

const longRecords = Array.from({ length: 82 }, (_, index) => ({ id: String(index), car_no: `CAR-${index + 1}`, area: `Area ${index + 1}` }));
const long = mapCarMasterLogToTemplate("2026", longRecords);
assert.equal(long.LOGSHEET_ROWS.length, 82);
assert.equal(long.LOGSHEET_ROWS[81].car_no, "CAR-82");

const rowsField = CAR_FORM_3_SCHEMA.fields.find((field) => field.key === "LOGSHEET_ROWS");
assert(rowsField?.controlled, "CAR master-log rows must be controlled.");
assert.equal(rowsField?.columns?.length, 6);

const migration = fs.readFileSync(new URL("../supabase/migrations/20261115043000_seed_car_form_3_template.sql", import.meta.url), "utf8");
const html = migration.match(/\$car_form_3\$([\s\S]*?)\$car_form_3\$/)?.[1] || "";
assert(html.includes("[CYCLE_YEAR]"));
assert(html.includes("[LOGSHEET_ROWS]"));
assert.match(html, /@page\{size:11in 8\.5in/);
assert.match(html, /thead\{display:table-header-group\}/);
assert.match(html, /page-break-inside:avoid/);

const accreditation = fs.readFileSync(new URL("../src/app/pages/AccreditationSupport.tsx", import.meta.url), "utf8");
assert(accreditation.includes("carLogCycle="));
assert(accreditation.includes("Generate master log"));
assert(!accreditation.includes(">Legacy Export<"));

const preview = fs.readFileSync(new URL("../src/app/features/document-composer/TemplatePreview.tsx", import.meta.url), "utf8");
assert(preview.includes('sandbox="allow-same-origin allow-modals"'));
assert(!preview.includes("allow-scripts"));

console.log("CAR Form 3 validation passed: dynamic empty/short/long rows, controlled data, landscape pagination, repeated headers, printing permission, and controlled workflow checks.");
