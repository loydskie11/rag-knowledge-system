import type { TemplateSchema, TemplateTableRowValue, TemplateValueMap } from "./types";

export interface CarMasterLogRecord {
  id: string;
  car_no?: string;
  date_issued?: string;
  area?: string;
  responsible_office?: string;
  issued_by?: string;
  status?: string;
}

export const CAR_FORM_3_SCHEMA: TemplateSchema = {
  metadata: { code: "CAR_FORM_3", name: "CAR / PAR Master Logsheet", formNumber: "CAR Form 3", revision: "0", pageSize: "letter", orientation: "landscape", owningOffice: "Quality Assurance Office", status: "ACTIVE", version: "1.0" },
  repositoryNames: ["CAR Form 3 Template", "CAR Form 3", "CAR / PAR Form 3"],
  fields: [
    { key: "CYCLE_YEAR", label: "Audit cycle", type: "text", placeholder: "[CYCLE_YEAR]", required: true, controlled: true },
    { key: "LOGSHEET_ROWS", label: "Canonical CAR master-log rows", type: "repeatable-table", placeholder: "[LOGSHEET_ROWS]", controlled: true, minimumRows: 0, maximumRows: 500, columns: [
      { key: "car_no", label: "CAR No." }, { key: "date_issued", label: "Date issued" }, { key: "area", label: "Area" },
      { key: "responsible_office", label: "Responsible office" }, { key: "issued_by", label: "Issued by" }, { key: "status", label: "Status" },
    ] },
  ],
  allowedPlaceholders: ["CYCLE_YEAR", "LOGSHEET_ROWS"],
};

export function mapCarMasterLogToTemplate(cycleYear: string, records: CarMasterLogRecord[]): TemplateValueMap {
  const rows: TemplateTableRowValue[] = records.map((record) => ({
    car_no: record.car_no || "", date_issued: record.date_issued || "", area: record.area || "",
    responsible_office: record.responsible_office || "", issued_by: record.issued_by || "", status: record.status || "",
  }));
  return { CYCLE_YEAR: cycleYear, LOGSHEET_ROWS: rows };
}

export function addCarMasterLogProvenance(html: string, cycleYear: string, recordCount: number, templateVersion: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const values: Record<string, string> = { "ctu-source-type": "CAR_MASTER_LOG", "ctu-cycle-year": cycleYear, "ctu-record-count": String(recordCount), "ctu-template-code": CAR_FORM_3_SCHEMA.metadata.code, "ctu-template-version": templateVersion, "ctu-generated-at": new Date().toISOString() };
  for (const [name, content] of Object.entries(values)) { const meta = doc.createElement("meta"); meta.setAttribute("name", name); meta.setAttribute("content", content); doc.head.appendChild(meta); }
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}
