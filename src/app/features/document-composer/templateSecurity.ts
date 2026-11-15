import type { TemplateSchema, TemplateValidationResult, TemplateValueMap } from "./types";

const BLOCKED_ELEMENTS = "script,iframe,frame,frameset,object,embed,applet,form,input,button,textarea,select,option,link,base";
const URL_ATTRIBUTES = new Set(["src", "href", "poster", "background", "action", "formaction", "xlink:href"]);

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeCss(css: string): string {
  return css
    .replace(/@import[\s\S]*?(?:;|$)/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/behavior\s*:[^;}]*/gi, "")
    .replace(/-moz-binding\s*:[^;}]*/gi, "")
    .replace(/url\s*\(\s*(['"]?)\s*(?!data:image\/)[^)]+\1\s*\)/gi, "none")
    .replace(/javascript\s*:/gi, "");
}

function safeUrl(value: string): boolean {
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f\s]+/g, "").toLowerCase();
  if (!normalized) return true;
  if (normalized.startsWith("data:image/")) return true;
  if (normalized.startsWith("blob:")) return true;
  if (normalized.startsWith("#") || normalized.startsWith("/") || normalized.startsWith("./") || normalized.startsWith("../")) return true;
  return false;
}

export function sanitizeTemplateHtml(sourceHtml: string): string {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(sourceHtml || "", "text/html");
  documentNode.querySelectorAll(BLOCKED_ELEMENTS).forEach((node) => node.remove());

  documentNode.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on") || name === "srcdoc") {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (URL_ATTRIBUTES.has(name) && !safeUrl(attribute.value)) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (name === "style") element.setAttribute("style", sanitizeCss(attribute.value));
    }
  });

  documentNode.querySelectorAll("style").forEach((style) => {
    style.textContent = sanitizeCss(style.textContent || "");
  });

  const csp = documentNode.createElement("meta");
  csp.setAttribute("http-equiv", "Content-Security-Policy");
  csp.setAttribute("content", "default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");
  documentNode.head.prepend(csp);
  return `<!doctype html>\n${documentNode.documentElement.outerHTML}`;
}

export function extractTemplatePlaceholders(html: string): string[] {
  const matches = html.match(/\[([A-Za-z0-9_ ,./&()-]+)\]/g) || [];
  return Array.from(new Set(matches.map((token) => token.slice(1, -1).trim()))).sort();
}

export function validateTemplateCompatibility(html: string, schema?: TemplateSchema): TemplateValidationResult {
  const placeholders = extractTemplatePlaceholders(html);
  if (!schema) {
    return { valid: false, placeholders, issues: [{ level: "error", code: "NO_SCHEMA", message: "This repository template does not have an approved field schema yet." }] };
  }
  const allowed = new Set(schema.allowedPlaceholders);
  const issues: TemplateValidationResult["issues"] = placeholders
    .filter((placeholder) => !allowed.has(placeholder))
    .map((placeholder) => ({ level: "error", code: "UNSUPPORTED_PLACEHOLDER", placeholder, message: `Unsupported placeholder [${placeholder}] is not declared by ${schema.metadata.code}.` }));

  for (const field of schema.fields.filter((item) => item.required && item.placeholder)) {
    const declaredTokens = field.placeholders || [field.placeholder!];
    if (!declaredTokens.some((token) => placeholders.includes(token.slice(1, -1)))) {
      const placeholder = declaredTokens[0].slice(1, -1);
      issues.push({ level: "warning", code: "MISSING_PLACEHOLDER", placeholder, message: `Required field “${field.label}” is not present in this template version.` });
    }
  }
  return { valid: !issues.some((issue) => issue.level === "error"), placeholders, issues };
}

function tableRowsHtml(rows: Array<Record<string, string>>, columns: NonNullable<TemplateSchema["fields"][number]["columns"]>): string {
  return rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column.key] || "")}</td>`).join("")}</tr>`).join("");
}

function templatedRowsHtml(rows: Array<Record<string, string>>, rowTemplate: string, columns: NonNullable<TemplateSchema["fields"][number]["columns"]>): string {
  return rows.map((row) => columns.reduce((markup, column) => markup.replaceAll(`{{${column.key}}}`, escapeHtml(row[column.key] || "")), rowTemplate)).join("");
}

export function renderTemplateHtml(html: string, schema: TemplateSchema, values: TemplateValueMap): string {
  let rendered = html;
  for (const field of schema.fields) {
    const value = values[field.key];
    if (field.type === "repeatable-text") {
      const entries = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
      const prefix = field.key.toUpperCase();
      for (let index = 1; index <= (field.maximumRows || entries.length); index += 1) {
        rendered = rendered.split(`[${prefix}_${index}]`).join(escapeHtml(entries[index - 1] || ""));
      }
      continue;
    }
    if (field.type === "repeatable-table") {
      const entries = Array.isArray(value) ? value.filter((item): item is Record<string, string> => typeof item === "object" && item !== null && !Array.isArray(item)) : [];
      const rowMarkup = field.rowTemplate
        ? templatedRowsHtml(entries, field.rowTemplate, field.columns || [])
        : tableRowsHtml(entries, field.columns || []);
      rendered = rendered.split(field.placeholder || `[${field.key}]`).join(rowMarkup);
      continue;
    }
    const scalar = typeof value === "boolean" ? (value ? "☑" : "☐") : typeof value === "string" ? value : "";
    const replacement = escapeHtml(scalar).replace(/\r?\n/g, "<br>");
    for (const token of field.placeholders || [field.placeholder || `[${field.key}]`]) {
      rendered = rendered.split(token).join(replacement);
    }
  }
  return sanitizeTemplateHtml(rendered);
}

export function addLetterheadImages(html: string, headerDataUrl: string, footerDataUrl: string): string {
  if (!headerDataUrl && !footerDataUrl) return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const style = doc.createElement("style");
  style.textContent = `.ctu-uploaded-header,.ctu-uploaded-footer{text-align:center;width:100%}.ctu-uploaded-header{margin-bottom:10px}.ctu-uploaded-footer{margin-top:12px}.ctu-uploaded-header img,.ctu-uploaded-footer img{display:block;max-width:100%;max-height:90px;object-fit:contain;margin:auto}@media print{@page{margin-top:30mm;margin-bottom:25mm}.ctu-uploaded-header{position:fixed;top:-25mm;left:0;right:0;margin:0}.ctu-uploaded-footer{position:fixed;bottom:-20mm;left:0;right:0;margin:0}.ctu-uploaded-header img{max-height:22mm}.ctu-uploaded-footer img{max-height:17mm}}`;
  doc.head.appendChild(style);
  if (headerDataUrl) {
    const header = doc.createElement("div"); header.className = "ctu-uploaded-header";
    const image = doc.createElement("img"); image.src = headerDataUrl; image.alt = "Uploaded document header"; header.appendChild(image);
    doc.body.prepend(header);
  }
  if (footerDataUrl) {
    const footer = doc.createElement("div"); footer.className = "ctu-uploaded-footer";
    const image = doc.createElement("img"); image.src = footerDataUrl; image.alt = "Uploaded document footer"; footer.appendChild(image);
    doc.body.appendChild(footer);
  }
  return sanitizeTemplateHtml(`<!doctype html>\n${doc.documentElement.outerHTML}`);
}

export function preparePrintableTemplateHtml(html: string, pageSize: "letter" | "a4" | "legal", orientation: "portrait" | "landscape"): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const dimensions = pageSize === "a4"
    ? (orientation === "landscape" ? "297mm 210mm" : "210mm 297mm")
    : pageSize === "legal"
      ? (orientation === "landscape" ? "14in 8.5in" : "8.5in 14in")
      : (orientation === "landscape" ? "11in 8.5in" : "8.5in 11in");
  const style = doc.createElement("style");
  style.setAttribute("data-ctu-print-rules", "true");
  style.textContent = `
    @page { size: ${dimensions}; }
    html, body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    img, svg { max-width: 100%; }
    table { border-collapse: collapse; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr, th, td, figure, img, .signature, .signature-block, .approval, .approval-block, [class*="signature"], [class*="approval"] {
      break-inside: avoid; page-break-inside: avoid;
    }
    h1, h2, h3, h4, h5, h6 { break-after: avoid; page-break-after: avoid; }
    .page-break, [data-page-break="before"] { break-before: page; page-break-before: always; }
    [data-page-break="after"] { break-after: page; page-break-after: always; }
    .keep-together, [data-keep-together="true"] { break-inside: avoid; page-break-inside: avoid; }
    @media print {
      html, body { margin: 0; background: #fff !important; }
      .page { margin: 0 auto !important; box-shadow: none !important; break-after: page; page-break-after: always; }
      .page:last-child { break-after: auto; page-break-after: auto; }
    }
  `;
  doc.head.appendChild(style);
  return sanitizeTemplateHtml(`<!doctype html>\n${doc.documentElement.outerHTML}`);
}
