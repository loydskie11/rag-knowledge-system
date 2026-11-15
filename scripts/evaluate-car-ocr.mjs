import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2] || "docs/car-ocr-evaluation/anonymized-baseline.json";
const absolutePath = path.resolve(inputPath);
const dataset = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
const fields = dataset.critical_fields || [];

const normalize = (value) => String(value ?? "")
  .normalize("NFKC")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, " ")
  .replace(/[’‘]/g, "'");

const fieldResults = Object.fromEntries(fields.map((field) => [field, { correct: 0, total: 0 }]));
let correct = 0;
let total = 0;

for (const sample of dataset.samples || []) {
  if (sample.status !== "CAPTURED") continue;
  for (const field of fields) {
    if (!(field in (sample.expected || {}))) continue;
    const matched = normalize(sample.expected[field]) === normalize(sample.predicted?.[field]);
    fieldResults[field].total += 1;
    fieldResults[field].correct += matched ? 1 : 0;
    total += 1;
    correct += matched ? 1 : 0;
  }
}

const percent = (matched, count) => count ? Number((matched / count * 100).toFixed(1)) : null;
const report = {
  dataset: dataset.name,
  captured_samples: (dataset.samples || []).filter((sample) => sample.status === "CAPTURED").length,
  overall: { correct, total, accuracy_percent: percent(correct, total) },
  fields: Object.fromEntries(Object.entries(fieldResults).map(([field, result]) => [field, {
    ...result,
    accuracy_percent: percent(result.correct, result.total),
  }])),
};

console.log(JSON.stringify(report, null, 2));
if (!total) process.exitCode = 2;
