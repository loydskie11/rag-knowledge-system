// MRC Form 2 (Management Review Meeting Minutes) Exporter & Token Resolver Utility
import apiClient from "@/app/api/client";

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

/**
 * Searches the Knowledge Repository for a document uploaded under the "Forms / Templates"
 * category matching "MRC Form 2", and returns its HTML content.
 */
export async function fetchMrcForm2TemplateFromRepo(): Promise<{ name: string; html: string }> {
  const res = await apiClient.get("/documents", { params: { category: "Forms / Templates" } });
  const docs: any[] = Array.isArray(res.data) ? res.data : [];
  
  const found = docs.find((d: any) => 
    d.category === "Forms / Templates" && 
    (d.name?.toLowerCase().includes("mrc form 2") || d.name?.toLowerCase().includes("mrc-form-2")) &&
    d.status !== "Archived"
  );

  if (!found) {
    throw new Error(
      "MRC Form 2 template not found in Knowledge Repository. Please upload your 'MRC Form 2' file under the 'Forms / Templates' category first."
    );
  }

  const contentRes = await apiClient.get(`/documents/${encodeURIComponent(found.name)}/content`);
  const html = contentRes.data?.content_html || "";
  
  if (!html.trim()) {
    throw new Error(`The uploaded template '${found.name}' has no HTML content.`);
  }

  return { name: found.name, html };
}

/**
 * Resolves template placeholders and tokens for MRC Form 2.
 * Attendance lines and agenda blanks are replaced with empty strings if not provided
 * in order to preserve clean, unbroken underline rules.
 */
export function resolveMrcForm2Tokens(
  templateHtml: string,
  data: MrcForm2Data = {}
): string {
  let html = templateHtml || "";

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

/**
 * Direct print/PDF export using standard browser print rules.
 */
export function printMrcForm2(htmlContent: string): void {
  const printWindow = window.open("", "_blank", "width=900,height=750");
  if (!printWindow) {
    alert("Please allow pop-ups to print or export MRC Form 2.");
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 400);
}
