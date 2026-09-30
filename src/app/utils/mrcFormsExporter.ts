import apiClient from "@/app/api/client";

export type NavigateFunction = (to: string, options?: { state?: any; replace?: boolean }) => void;

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

// MRC Form 4: Annual Plan (9 columns)
export interface MrcForm4Row {
  function_area?: string;
  objectives?: string;
  strategies?: string;
  time_frame?: string;
  persons_involved?: string;
  budget?: string;
  expected_output?: string;
  actual_accomplishment?: string;
  remarks?: string;
}

export interface MrcForm4Data {
  year?: string;
  rows?: (MrcForm4Row | string[])[];
  prepared_by?: string;
  vp_admin?: string;
  vp_rd?: string;
  vp_acad?: string;
  vp_peba?: string;
  approved_by?: string;
}

// MRC Form 5: Risk Identification (10 columns)
export interface MrcForm5Row {
  issues?: string;
  risks?: string;
  impact?: string;
  likelihood?: string;
  risk_factor?: string;
  risk_control?: string;
  target_date?: string;
  persons_responsible?: string;
  date_of_assessment?: string;
  date_of_completion?: string;
}

export interface MrcForm5Data {
  unit_name?: string;
  objective_text?: string;
  rows?: (MrcForm5Row | string[])[];
  prepared_by?: string;
  reviewed_by?: string;
  approved_by?: string;
}

// MRC Form 7: Relevant Issues Log (8 columns)
export interface MrcForm7Row {
  interested_parties?: string;
  internal_external?: string;
  reasons_for_inclusion?: string;
  issues_of_concern?: string;
  processes_affected?: string;
  priority?: string;
  treatment_method?: string;
  records_references?: string;
}

export interface MrcForm7Data {
  rows?: (MrcForm7Row | string[])[];
  prepared_by?: string;
  approved_by?: string;
}

// MRC Form 2: Meeting Minutes
export interface MrcForm2Data {
  no?: string;
  date?: string;
  time_started?: string;
  time_adjourned?: string;
  attendance?: string[]; // Up to 9 attendees
  agenda?: string[];     // Up to 4 additional agenda items
  recorded_by_name?: string;
  noted_by_name?: string;
}

// ---------------------------------------------------------------------------
// TEMPLATE RETRIEVAL & STYLING
// ---------------------------------------------------------------------------

/**
 * Fetches HTML content for an MRC template document from the Knowledge Repository.
 * 1. Checks `/documents/{exact_name}/content` directly.
 * 2. Falls back to a search in `/documents` if exact match isn't found immediately.
 */
export async function fetchMrcTemplate(templateName: string): Promise<string> {
  try {
    const resp = await apiClient.get(`/documents/${encodeURIComponent(templateName)}/content`);
    const html = resp.data?.content_html;
    if (html && typeof html === "string" && html.trim()) {
      return html;
    }
  } catch (err: any) {
    console.warn(`Direct fetch for '${templateName}' failed, trying fallback search...`, err);
  }

  // Fallback search in documents list
  try {
    const listResp = await apiClient.get("/documents");
    const docs: any[] = Array.isArray(listResp.data) ? listResp.data : [];
    
    // Normalize target name (e.g., "mrc form 4")
    const cleanTarget = templateName.toLowerCase().replace("template", "").replace(".html", "").trim();
    const match = docs.find((d: any) => {
      const name = (d.name || d.title || "").toLowerCase();
      return name.includes(cleanTarget) && d.status !== "Archived";
    });

    if (match) {
      const resp = await apiClient.get(`/documents/${encodeURIComponent(match.name || match.title)}/content`);
      const html = resp.data?.content_html;
      if (html && typeof html === "string" && html.trim()) {
        return html;
      }
    }
  } catch (searchErr) {
    console.warn("Fallback template search error:", searchErr);
  }

  throw new Error(
    `'${templateName}' not found in the Knowledge Repository. Please upload it first under Forms / Templates.`
  );
}

/**
 * Scopes global CSS tags inside the fetched HTML to prevent styles from leaking
 * into the main React application when injected into the Document Studio wysiwyg editor.
 */
export function scopeTemplateStyles(html: string): string {
  return html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    const scopedCss = css
      .replace(/(?:\b|^)body\s*\{/gi, ".wysiwyg-content {")
      .replace(/(?:\b|^)html\s*\{/gi, ".wysiwyg-content {")
      .replace(/(?:\b|^|\s)\*\s*\{/gi, " .wysiwyg-content * {");
    return `<style>\n${scopedCss}\n</style>`;
  });
}

// ---------------------------------------------------------------------------
// TABLE ROW GENERATORS
// ---------------------------------------------------------------------------

/**
 * Builds table rows matching Form 4's 9-column layout:
 * 1. FUNCTION/AREA
 * 2. OBJECTIVES
 * 3. STRATEGIES
 * 4. TIME FRAME
 * 5. PERSONS INVOLVED
 * 6. BUDGET
 * 7. EXPECTED OUTPUT
 * 8. ACTUAL ACCOMPLISHMENT
 * 9. REMARKS
 */
export function buildForm4Rows(rows?: (MrcForm4Row | string[])[], minRows = 15): string {
  const rowList = rows || [];
  const count = Math.max(rowList.length, minRows);
  let rowsHtml = "";

  for (let i = 0; i < count; i++) {
    const r = rowList[i];
    if (r) {
      if (Array.isArray(r)) {
        rowsHtml += `      <tr>${Array.from({ length: 9 }, (_, c) => `<td>${r[c] || "&nbsp;"}</td>`).join("")}</tr>\n`;
      } else {
        rowsHtml += `      <tr>
        <td>${r.function_area || "&nbsp;"}</td>
        <td>${r.objectives || "&nbsp;"}</td>
        <td>${r.strategies || "&nbsp;"}</td>
        <td>${r.time_frame || "&nbsp;"}</td>
        <td>${r.persons_involved || "&nbsp;"}</td>
        <td>${r.budget || "&nbsp;"}</td>
        <td>${r.expected_output || "&nbsp;"}</td>
        <td>${r.actual_accomplishment || "&nbsp;"}</td>
        <td>${r.remarks || "&nbsp;"}</td>
      </tr>\n`;
      }
    } else {
      rowsHtml += `      <tr>${"<td>&nbsp;</td>".repeat(9)}</tr>\n`;
    }
  }

  return rowsHtml.trimEnd();
}

/**
 * Builds table rows matching Form 5's 10-column layout:
 * 1. ISSUES
 * 2. RISKS
 * 3. IMPACT
 * 4. LIKELIHOOD
 * 5. RISK FACTOR
 * 6. RISK CONTROL/ACTION TO BE TAKEN
 * 7. TARGET DATE
 * 8. PERSON/S RESPONSIBLE
 * 9. DATE OF ASSESSMENT
 * 10. DATE OF ACTUAL COMPLETION
 */
export function buildForm5Rows(rows?: (MrcForm5Row | string[])[], minRows = 15): string {
  const rowList = rows || [];
  const count = Math.max(rowList.length, minRows);
  let rowsHtml = "";

  for (let i = 0; i < count; i++) {
    const r = rowList[i];
    if (r) {
      if (Array.isArray(r)) {
        rowsHtml += `      <tr>${Array.from({ length: 10 }, (_, c) => `<td>${r[c] || "&nbsp;"}</td>`).join("")}</tr>\n`;
      } else {
        rowsHtml += `      <tr>
        <td>${r.issues || "&nbsp;"}</td>
        <td>${r.risks || "&nbsp;"}</td>
        <td>${r.impact || "&nbsp;"}</td>
        <td>${r.likelihood || "&nbsp;"}</td>
        <td>${r.risk_factor || "&nbsp;"}</td>
        <td>${r.risk_control || "&nbsp;"}</td>
        <td>${r.target_date || "&nbsp;"}</td>
        <td>${r.persons_responsible || "&nbsp;"}</td>
        <td>${r.date_of_assessment || "&nbsp;"}</td>
        <td>${r.date_of_completion || "&nbsp;"}</td>
      </tr>\n`;
      }
    } else {
      rowsHtml += `      <tr>${"<td>&nbsp;</td>".repeat(10)}</tr>\n`;
    }
  }

  return rowsHtml.trimEnd();
}

/**
 * Builds table rows matching Form 7's 8-column layout:
 * 1. INTERESTED PARTIES
 * 2. INTERNAL/EXTERNAL
 * 3. REASONS FOR INCLUSION
 * 4. ISSUES OF CONCERN
 * 5. PROCESSES AFFECTED
 * 6. PRIORITY
 * 7. TREATMENT METHOD
 * 8. RECORDS REFERENCES/NOTES
 */
export function buildForm7Rows(rows?: (MrcForm7Row | string[])[], minRows = 15): string {
  const rowList = rows || [];
  const count = Math.max(rowList.length, minRows);
  let rowsHtml = "";

  for (let i = 0; i < count; i++) {
    const r = rowList[i];
    if (r) {
      if (Array.isArray(r)) {
        rowsHtml += `      <tr>${Array.from({ length: 8 }, (_, c) => `<td>${r[c] || "&nbsp;"}</td>`).join("")}</tr>\n`;
      } else {
        rowsHtml += `      <tr>
        <td>${r.interested_parties || "&nbsp;"}</td>
        <td>${r.internal_external || "&nbsp;"}</td>
        <td>${r.reasons_for_inclusion || "&nbsp;"}</td>
        <td>${r.issues_of_concern || "&nbsp;"}</td>
        <td>${r.processes_affected || "&nbsp;"}</td>
        <td>${r.priority || "&nbsp;"}</td>
        <td>${r.treatment_method || "&nbsp;"}</td>
        <td>${r.records_references || "&nbsp;"}</td>
      </tr>\n`;
      }
    } else {
      rowsHtml += `      <tr>${"<td>&nbsp;</td>".repeat(8)}</tr>\n`;
    }
  }

  return rowsHtml.trimEnd();
}

// ---------------------------------------------------------------------------
// TOKEN RESOLVERS
// ---------------------------------------------------------------------------

/**
 * Resolves template placeholders and tokens for MRC Form 4 (Annual Plan).
 */
export function resolveMrcForm4Tokens(templateHtml: string, data: MrcForm4Data = {}): string {
  let html = scopeTemplateStyles(templateHtml);

  // Year replacement
  const year = data.year || new Date().getFullYear().toString();
  html = html.split("[YEAR]").join(year);

  // Signatories
  html = html.split("[PREPARED_BY]").join(data.prepared_by || "");
  html = html.split("[VP_ADMIN]").join(data.vp_admin || "");
  html = html.split("[VP_RD]").join(data.vp_rd || "");
  html = html.split("[VP_ACAD]").join(data.vp_acad || "");
  html = html.split("[VP_PEBA]").join(data.vp_peba || "");
  html = html.split("[APPROVED_BY]").join(data.approved_by || "");

  // Table rows (9 columns)
  const rowsHtml = buildForm4Rows(data.rows);
  html = html.split("[LOGSHEET_ROWS]").join(rowsHtml);

  return html;
}

/**
 * Resolves template placeholders and tokens for MRC Form 5 (Risk Identification).
 */
export function resolveMrcForm5Tokens(templateHtml: string, data: MrcForm5Data = {}): string {
  let html = scopeTemplateStyles(templateHtml);

  // Unit Name & Objective Text
  html = html.split("[UNIT_NAME]").join(data.unit_name || "");
  html = html.split("[OBJECTIVE_TEXT]").join(data.objective_text || "");

  // Signatories
  html = html.split("[PREPARED_BY]").join(data.prepared_by || "");
  html = html.split("[REVIEWED_BY]").join(data.reviewed_by || "");
  html = html.split("[APPROVED_BY]").join(data.approved_by || "");

  // Table rows (10 columns)
  const rowsHtml = buildForm5Rows(data.rows);
  html = html.split("[LOGSHEET_ROWS]").join(rowsHtml);

  return html;
}

/**
 * Resolves template placeholders and tokens for MRC Form 7 (Relevant Issues Log).
 */
export function resolveMrcForm7Tokens(templateHtml: string, data: MrcForm7Data = {}): string {
  let html = scopeTemplateStyles(templateHtml);

  // Signatories
  html = html.split("[PREPARED_BY]").join(data.prepared_by || "");
  html = html.split("[APPROVED_BY]").join(data.approved_by || "");

  // Table rows (8 columns)
  const rowsHtml = buildForm7Rows(data.rows);
  html = html.split("[LOGSHEET_ROWS]").join(rowsHtml);

  return html;
}

/**
 * Resolves template placeholders and tokens for MRC Form 2 (Management Review Minutes).
 */
export function resolveMrcForm2Tokens(templateHtml: string, data: MrcForm2Data = {}): string {
  let html = scopeTemplateStyles(templateHtml);

  // Meeting Details
  html = html.split("[NO]").join(data.no || "");
  html = html.split("[DATE]").join(data.date || "");
  html = html.split("[TIME_STARTED]").join(data.time_started || "");
  html = html.split("[TIME_ADJOURNED]").join(data.time_adjourned || "");

  // Attendance Lines 1 through 9
  const attendanceList = data.attendance || [];
  for (let i = 1; i <= 9; i++) {
    const token = `[ATTENDANCE_${i}]`;
    const attendee = attendanceList[i - 1] ? attendanceList[i - 1].trim() : "";
    html = html.split(token).join(attendee);
  }

  // Additional Agenda Lines 1 through 4
  const agendaList = data.agenda || [];
  for (let i = 1; i <= 4; i++) {
    const token = `[AGENDA_${i}]`;
    const agendaItem = agendaList[i - 1] ? agendaList[i - 1].trim() : "";
    html = html.split(token).join(agendaItem);
  }

  // Signatories
  html = html.split("[RECORDED_BY_NAME]").join(data.recorded_by_name || "");
  html = html.split("[NOTED_BY_NAME]").join(data.noted_by_name || "");

  return html;
}

// ---------------------------------------------------------------------------
// HIGH-LEVEL EXPORT PIPELINE FUNCTIONS (ROUTING TO DOCUMENT STUDIO)
// ---------------------------------------------------------------------------

/**
 * Exports MRC Form 4 (Annual Plan) to the Document Studio.
 */
export async function exportMrcForm4(
  data: MrcForm4Data,
  navigate: NavigateFunction,
  showToast?: (msg: string, type: "info" | "success" | "error" | "warning") => void
): Promise<void> {
  try {
    showToast?.("Fetching MRC Form 4 Template...", "info");
    const rawHtml = await fetchMrcTemplate("MRC Form 4 Template");
    const resolvedHtml = resolveMrcForm4Tokens(rawHtml, data);
    showToast?.("Redirecting to Document Studio...", "success");
    navigate("/app/document-generator", { state: { injectedHtml: resolvedHtml } });
  } catch (err: any) {
    console.error("exportMrcForm4 error:", err);
    showToast?.(err.message || "Failed to export MRC Form 4.", "error");
    throw err;
  }
}

/**
 * Exports MRC Form 5 (Risk Identification) to the Document Studio.
 */
export async function exportMrcForm5(
  data: MrcForm5Data,
  navigate: NavigateFunction,
  showToast?: (msg: string, type: "info" | "success" | "error" | "warning") => void
): Promise<void> {
  try {
    showToast?.("Fetching MRC Form 5 Template...", "info");
    const rawHtml = await fetchMrcTemplate("MRC Form 5 Template");
    const resolvedHtml = resolveMrcForm5Tokens(rawHtml, data);
    showToast?.("Redirecting to Document Studio...", "success");
    navigate("/app/document-generator", { state: { injectedHtml: resolvedHtml } });
  } catch (err: any) {
    console.error("exportMrcForm5 error:", err);
    showToast?.(err.message || "Failed to export MRC Form 5.", "error");
    throw err;
  }
}

/**
 * Exports MRC Form 7 (Relevant Issues Log) to the Document Studio.
 */
export async function exportMrcForm7(
  data: MrcForm7Data,
  navigate: NavigateFunction,
  showToast?: (msg: string, type: "info" | "success" | "error" | "warning") => void
): Promise<void> {
  try {
    showToast?.("Fetching MRC Form 7 Template...", "info");
    const rawHtml = await fetchMrcTemplate("MRC Form 7 Template");
    const resolvedHtml = resolveMrcForm7Tokens(rawHtml, data);
    showToast?.("Redirecting to Document Studio...", "success");
    navigate("/app/document-generator", { state: { injectedHtml: resolvedHtml } });
  } catch (err: any) {
    console.error("exportMrcForm7 error:", err);
    showToast?.(err.message || "Failed to export MRC Form 7.", "error");
    throw err;
  }
}

/**
 * Exports MRC Form 2 (Management Review Minutes) to the Document Studio.
 */
export async function exportMrcForm2(
  data: MrcForm2Data,
  navigate: NavigateFunction,
  showToast?: (msg: string, type: "info" | "success" | "error" | "warning") => void
): Promise<void> {
  try {
    showToast?.("Fetching MRC Form 2 Template...", "info");
    const rawHtml = await fetchMrcTemplate("MRC Form 2 Template");
    const resolvedHtml = resolveMrcForm2Tokens(rawHtml, data);
    showToast?.("Redirecting to Document Studio...", "success");
    navigate("/app/document-generator", { state: { injectedHtml: resolvedHtml } });
  } catch (err: any) {
    console.error("exportMrcForm2 error:", err);
    showToast?.(err.message || "Failed to export MRC Form 2.", "error");
    throw err;
  }
}
