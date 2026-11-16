import fs from "node:fs";

const security = fs.readFileSync("src/app/features/document-composer/templateSecurity.ts", "utf8");
const composer = fs.readFileSync("src/app/pages/TemplateDocumentComposer.tsx", "utf8");
const preview = fs.readFileSync("src/app/features/document-composer/TemplatePreview.tsx", "utf8");

const checks = [
  ["page dimensions and orientation", security.includes("preparePrintableTemplateHtml") && security.includes('orientation === "landscape"') && security.includes("@page { size:")],
  ["print color preservation", security.includes("print-color-adjust: exact") && security.includes("-webkit-print-color-adjust: exact")],
  ["table headers and footers repeat", security.includes("display: table-header-group") && security.includes("display: table-footer-group")],
  ["rows and signatures remain together", security.includes('tr, th, td, figure, img, .signature') && security.includes("page-break-inside: avoid")],
  ["explicit page break utilities", security.includes('data-page-break="before"') && security.includes('data-page-break="after"')],
  ["preview uses printable HTML", composer.includes("preparePrintableTemplateHtml(withLetterhead")],
  ["images and fonts finish before printing", composer.includes("frameDocument.fonts?.ready") && composer.includes("frameDocument.images")],
  ["isolated offline preview", preview.includes('sandbox="allow-same-origin allow-modals"') && preview.includes('referrerPolicy="no-referrer"')],
  ["controlled composer excludes unreliable DOCX export", !composer.includes("Download DOCX") && !composer.includes("downloadDocx") && composer.includes("Print / PDF")],
];

const failures = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"}: ${name}`);
if (failures.length) {
  console.error(`\n${failures.length} Phase 10 export validation check(s) failed.`);
  process.exit(1);
}
console.log("\nPhase 10 export validation passed.");
