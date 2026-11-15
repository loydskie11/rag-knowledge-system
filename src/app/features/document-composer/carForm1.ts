import type { TemplateSchema, TemplateValueMap } from "./types";

export interface CarActionReportItem {
  corrective_measure?: string;
  immediate_action?: string;
  root_cause?: string;
  personnel_responsible?: string;
  target_date?: string;
  status?: string;
}

export interface CarReportRecord {
  id: string;
  car_no?: string;
  date_issued?: string;
  revision?: string;
  finding_category?: string;
  type_of_non_conformity?: string;
  auditor_name?: string;
  acknowledged_by?: string;
  acknowledged_by_name?: string;
  campus?: string;
  area?: string;
  responsible_office?: string;
  findings?: string;
  nonconformity_statement?: string;
  immediate_action?: string;
  root_cause?: string;
  corrective_measure?: string;
  measures_proposed_by?: string;
  assigned_to_name?: string;
  target_date?: string;
  follow_up_result?: string;
  effectiveness_outcome?: string;
  follow_up_date?: string;
  comments_remarks?: string;
  non_conformity_closed?: boolean;
  status?: string;
}

export interface CarReportPayload {
  car: CarReportRecord;
  actions?: CarActionReportItem[];
  report_generated_at?: string;
  report_generated_by?: string;
}

export const CAR_FORM_1_SCHEMA: TemplateSchema = {
  metadata: {
    code: "CAR_FORM_1",
    name: "Corrective Action Request",
    formNumber: "CAR Form 1",
    revision: "3",
    effectiveDate: "2024-08-01",
    pageSize: "letter",
    orientation: "portrait",
    owningOffice: "Quality Assurance Office",
    status: "ACTIVE",
    version: "1.0",
  },
  repositoryNames: ["CAR Form 1 Template", "CAR Form 1", "Corrective Action Request Form 1"],
  fields: [
    { key: "CAR_NO", label: "CAR number", type: "text", placeholder: "[CAR_NO]", required: true, controlled: true },
    { key: "REVISION", label: "Form revision", type: "text", placeholder: "[REVISION]", controlled: true },
    { key: "CAMPUS", label: "Campus", type: "text", placeholder: "[CAMPUS]", required: true, controlled: true },
    { key: "DATE_ISSUED", label: "Date issued", type: "date", placeholder: "[DATE_ISSUED]", required: true, controlled: true },
    { key: "AREA", label: "Department / area", type: "text", placeholder: "[AREA]", required: true, controlled: true },
    { key: "FINDINGS", label: "Statement / findings", type: "multiline", placeholder: "[FINDINGS]", required: true, controlled: true },
    { key: "CHECK_MAJOR", label: "Major finding", type: "checkbox", placeholder: "[CHECK_MAJOR]", controlled: true },
    { key: "CHECK_MINOR", label: "Minor finding", type: "checkbox", placeholder: "[CHECK_MINOR]", controlled: true },
    { key: "CHECK_OBS", label: "Observation", type: "checkbox", placeholder: "[CHECK_OBS]", controlled: true },
    { key: "AUDITOR", label: "Auditor / complainant", type: "person", placeholder: "[AUDITOR]", required: true, controlled: true },
    { key: "ACKNOWLEDGED_BY", label: "Acknowledged by", type: "person", placeholder: "[ACKNOWLEDGED_BY]", controlled: true },
    { key: "CHECK_QMS", label: "QMS related", type: "checkbox", placeholder: "[CHECK_QMS]", controlled: true },
    { key: "CHECK_SECURITY", label: "Security related", type: "checkbox", placeholder: "[CHECK_SECURITY]", controlled: true },
    { key: "CHECK_FEEDBACK", label: "Customer feedback", type: "checkbox", placeholder: "[CHECK_FEEDBACK]", controlled: true },
    { key: "CHECK_COMPLAINT", label: "Customer complaint", type: "checkbox", placeholder: "[CHECK_COMPLAINT]", controlled: true },
    { key: "CHECK_OTHER", label: "Other nonconformity type", type: "checkbox", placeholder: "[CHECK_OTHER]", controlled: true },
    { key: "OTHER_DESC", label: "Other type description", type: "text", placeholder: "[OTHER_DESC]", controlled: true },
    { key: "IMMEDIATE_ACTION", label: "Immediate action", type: "multiline", placeholder: "[IMMEDIATE_ACTION]", helpText: "Output-only adjustment; this does not change the official CAR record." },
    { key: "ROOT_CAUSE", label: "Root cause", type: "multiline", placeholder: "[ROOT_CAUSE]", helpText: "Output-only adjustment; this does not change the official CAR record." },
    { key: "CORRECTIVE_MEASURE", label: "Proposed corrective measures", type: "multiline", placeholder: "[CORRECTIVE_MEASURE]", helpText: "Output-only adjustment; this does not change the official CAR record." },
    { key: "PROPOSED_BY", label: "Measures proposed by", type: "person", placeholder: "[PROPOSED_BY]", controlled: true },
    { key: "TARGET_DATE", label: "Target implementation date", type: "date", placeholder: "[TARGET_DATE]", controlled: true },
    { key: "CHECK_EFFECTIVE", label: "Measures effective", type: "checkbox", placeholder: "[CHECK_EFFECTIVE]", controlled: true },
    { key: "CHECK_INEFFECTIVE", label: "Measures ineffective", type: "checkbox", placeholder: "[CHECK_INEFFECTIVE]", controlled: true },
    { key: "FOLLOWUP_DATE", label: "Follow-up date", type: "date", placeholder: "[FOLLOWUP_DATE]", controlled: true },
    { key: "REMARKS", label: "Verification comments / remarks", type: "multiline", placeholder: "[REMARKS]", controlled: true },
    { key: "STATUS_CLOSED", label: "Nonconformity closed", type: "checkbox", placeholder: "[STATUS_CLOSED]", controlled: true },
    { key: "FOLLOWUP_COMPLETE", label: "Follow-up complete", type: "checkbox", placeholder: "[FOLLOWUP_COMPLETE]", controlled: true },
    { key: "FOLLOWUP_INEFFECTIVE", label: "Follow-up requires another review", type: "checkbox", placeholder: "[FOLLOWUP_INEFFECTIVE]", controlled: true },
  ],
  allowedPlaceholders: [
    "CAR_NO", "REVISION", "CAMPUS", "DATE_ISSUED", "AREA", "FINDINGS", "CHECK_MAJOR", "CHECK_MINOR", "CHECK_OBS",
    "AUDITOR", "ACKNOWLEDGED_BY", "CHECK_QMS", "CHECK_SECURITY", "CHECK_FEEDBACK", "CHECK_COMPLAINT", "CHECK_OTHER",
    "OTHER_DESC", "IMMEDIATE_ACTION", "ROOT_CAUSE", "CORRECTIVE_MEASURE", "PROPOSED_BY", "TARGET_DATE", "CHECK_EFFECTIVE",
    "CHECK_INEFFECTIVE", "FOLLOWUP_DATE", "REMARKS", "STATUS_CLOSED", "FOLLOWUP_COMPLETE", "FOLLOWUP_INEFFECTIVE",
  ],
};

function combineActionText(actions: CarActionReportItem[] | undefined, field: keyof CarActionReportItem): string {
  const values = (actions || []).map((action) => String(action[field] || "").trim()).filter(Boolean);
  return Array.from(new Set(values)).map((value, index) => values.length > 1 ? `${index + 1}. ${value}` : value).join("\n");
}

export function mapCarReportToTemplate(payload: CarReportPayload): TemplateValueMap {
  const car = payload.car;
  const category = String(car.finding_category || "").toUpperCase();
  const nonconformityType = String(car.type_of_non_conformity || "").toLowerCase();
  const outcome = String(car.effectiveness_outcome || car.follow_up_result || "").toUpperCase();
  const closed = car.non_conformity_closed === true || car.status === "Closed";
  const ineffective = outcome.includes("INEFFECTIVE") || outcome.includes("PARTIALLY_EFFECTIVE") || outcome.includes("ADDITIONAL_EVIDENCE");
  const actionImmediate = combineActionText(payload.actions, "immediate_action");
  const actionRootCause = combineActionText(payload.actions, "root_cause");
  const actionMeasures = combineActionText(payload.actions, "corrective_measure");

  return {
    CAR_NO: car.car_no || "",
    REVISION: car.revision || CAR_FORM_1_SCHEMA.metadata.revision,
    CAMPUS: car.campus || "Argao Campus",
    DATE_ISSUED: car.date_issued || "",
    AREA: car.area || car.responsible_office || "",
    FINDINGS: car.nonconformity_statement || car.findings || "",
    CHECK_MAJOR: category === "MAJOR",
    CHECK_MINOR: category === "MINOR",
    CHECK_OBS: category === "OBSERVATION" || category === "OPPORTUNITY_FOR_IMPROVEMENT",
    AUDITOR: car.auditor_name || "",
    ACKNOWLEDGED_BY: car.acknowledged_by_name || car.acknowledged_by || "",
    CHECK_QMS: nonconformityType.includes("qms"),
    CHECK_SECURITY: nonconformityType.includes("security"),
    CHECK_FEEDBACK: nonconformityType.includes("feedback"),
    CHECK_COMPLAINT: nonconformityType.includes("complaint"),
    CHECK_OTHER: nonconformityType.includes("other"),
    OTHER_DESC: nonconformityType.includes("other") ? car.type_of_non_conformity || "" : "",
    IMMEDIATE_ACTION: car.immediate_action || actionImmediate,
    ROOT_CAUSE: car.root_cause || actionRootCause,
    CORRECTIVE_MEASURE: car.corrective_measure || actionMeasures,
    PROPOSED_BY: car.measures_proposed_by || car.assigned_to_name || car.acknowledged_by_name || car.acknowledged_by || "",
    TARGET_DATE: car.target_date || "",
    CHECK_EFFECTIVE: outcome === "EFFECTIVE",
    CHECK_INEFFECTIVE: ineffective,
    FOLLOWUP_DATE: car.follow_up_date || "",
    REMARKS: car.comments_remarks || "",
    STATUS_CLOSED: closed,
    FOLLOWUP_COMPLETE: closed,
    FOLLOWUP_INEFFECTIVE: !closed && ineffective,
  };
}

export function addCarGenerationProvenance(html: string, payload: CarReportPayload, templateVersion: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const values: Record<string, string> = {
    "ctu-source-type": "CAR_FORM",
    "ctu-source-id": payload.car.id,
    "ctu-car-number": payload.car.car_no || "",
    "ctu-template-code": CAR_FORM_1_SCHEMA.metadata.code,
    "ctu-template-version": templateVersion,
    "ctu-generated-at": payload.report_generated_at || new Date().toISOString(),
    "ctu-generated-by": payload.report_generated_by || "authenticated user",
  };
  for (const [name, content] of Object.entries(values)) {
    const meta = doc.createElement("meta");
    meta.setAttribute("name", name);
    meta.setAttribute("content", content);
    doc.head.appendChild(meta);
  }
  doc.body.dataset.ctuSourceId = payload.car.id;
  doc.body.dataset.ctuTemplateVersion = templateVersion;
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}
