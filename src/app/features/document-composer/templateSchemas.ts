import type { TemplateFieldDefinition, TemplateSchema } from "./types";
import { CAR_FORM_1_SCHEMA } from "./carForm1";
import { CAR_FORM_3_SCHEMA } from "./carForm3";

const text = (key: string, label: string, required = false, controlled = false): TemplateFieldDefinition => ({
  key, label, type: "text", placeholder: `[${key}]`, required, controlled,
});

const person = (key: string, label: string, required = false): TemplateFieldDefinition => ({
  key, label, type: "person", placeholder: `[${key}]`, required,
});

const rows = (columns: Array<{ key: string; label: string }>): TemplateFieldDefinition => ({
  key: "LOGSHEET_ROWS", label: "Table rows", type: "repeatable-table", placeholder: "[LOGSHEET_ROWS]",
  columns, minimumRows: 1, maximumRows: 100,
});

const signatureFields = [
  person("PREPARED_BY", "Prepared by"), person("REVIEWED_BY", "Reviewed by"),
  person("APPROVED_BY", "Approved by"),
];

export const TEMPLATE_SCHEMAS: TemplateSchema[] = [
  CAR_FORM_1_SCHEMA,
  CAR_FORM_3_SCHEMA,
  {
    metadata: { code: "MEMORANDUM", name: "Official Memorandum", revision: "1", pageSize: "letter", orientation: "portrait", owningOffice: "Campus Administration", status: "ACTIVE", version: "1.0" },
    repositoryNames: ["Memo Template", "Memorandum Template", "Official Memorandum Template"],
    fields: [
      text("SENDER OFFICE", "Sender office", true, true), { ...text("Date", "Date", true), type: "date" },
      text("Memorandum Number", "Memorandum number", true), text("Current Year", "Series year", true),
      { ...person("Sender Name", "Sender name", true), controlled: true, placeholders: ["[Sender Name]", "[SENDER NAME]"] }, text("Sender Title", "Sender title", true, true),
      { key: "Recipient Rows", label: "Recipients", type: "repeatable-table", placeholder: "[Recipient Rows]", required: true, columns: [{ key: "name", label: "Name / office" }, { key: "title", label: "Title" }], rowTemplate: '<div class="recipient-item"><strong>{{name}}</strong><span> — {{title}}</span></div>', minimumRows: 1, maximumRows: 30 },
      text("SUBJECT", "Subject", true), { key: "Memo Body", label: "Memorandum body", type: "multiline", placeholder: "[Memo Body]", required: true },
    ],
    allowedPlaceholders: ["SENDER OFFICE", "Date", "Memorandum Number", "Current Year", "Sender Name", "Sender Title", "Recipient Rows", "SUBJECT", "Memo Body", "SENDER NAME"],
  },
  {
    metadata: { code: "MRC_FORM_2", name: "Management Review Meeting Minutes", formNumber: "MRC Form 2", revision: "1", effectiveDate: "2024-08-01", pageSize: "letter", orientation: "portrait", owningOffice: "Quality Assurance Office", status: "ACTIVE", version: "1.0" },
    repositoryNames: ["MRC Form 2", "MRC-Form-2"],
    fields: [
      text("NO", "Meeting number", true), { ...text("DATE", "Meeting date", true), type: "date" },
      { ...text("TIME_STARTED", "Time started", true), type: "time" }, { ...text("TIME_ADJOURNED", "Time adjourned", true), type: "time" },
      { key: "ATTENDANCE", label: "Attendance", type: "repeatable-text", required: true, minimumRows: 1, maximumRows: 9 },
      { key: "AGENDA", label: "Additional agenda items", type: "repeatable-text", minimumRows: 0, maximumRows: 4 },
      person("RECORDED_BY_NAME", "Recorded by", true), person("NOTED_BY_NAME", "Noted by", true),
    ],
    allowedPlaceholders: ["NO", "DATE", "TIME_STARTED", "TIME_ADJOURNED", ...Array.from({ length: 9 }, (_, i) => `ATTENDANCE_${i + 1}`), ...Array.from({ length: 4 }, (_, i) => `AGENDA_${i + 1}`), "RECORDED_BY_NAME", "NOTED_BY_NAME"],
  },
  {
    metadata: { code: "MRC_FORM_3", name: "Short, Medium, and Long Term Plan", formNumber: "MRC Form 3", revision: "0", effectiveDate: "2012-10-01", pageSize: "letter", orientation: "landscape", owningOffice: "Quality Assurance Office", status: "ACTIVE", version: "1.0" },
    repositoryNames: ["MRC Form 3", "MRC-Form-3"],
    fields: [text("YEAR_1", "Year 1", true), text("YEAR_2", "Year 2", true), text("YEAR_3", "Year 3", true), rows([{ key: "function_area", label: "Function area" }, { key: "objective", label: "Objective" }, { key: "kra_1", label: "Short-term KRA" }, { key: "short_term", label: "Short-term timetable" }, { key: "kra_2", label: "Medium-term KRA" }, { key: "medium_term", label: "Medium-term timetable" }, { key: "kra_3", label: "Long-term KRA" }, { key: "long_term", label: "Long-term timetable" }]), person("PREPARED_BY", "Prepared by"), person("VP_ADMIN", "VP Administration"), person("VP_RD", "VP Research and Development"), person("VP_ACAD", "VP Academic Affairs"), person("VP_PEBA", "VP Production, Extension and Business Affairs"), person("APPROVED_BY", "Approved by")],
    allowedPlaceholders: ["YEAR_1", "YEAR_2", "YEAR_3", "LOGSHEET_ROWS", "PREPARED_BY", "VP_ADMIN", "VP_RD", "VP_ACAD", "VP_PEBA", "APPROVED_BY"],
  },
  {
    metadata: { code: "MRC_FORM_4", name: "Annual Plan", formNumber: "MRC Form 4", revision: "0", effectiveDate: "2012-10-01", pageSize: "letter", orientation: "landscape", owningOffice: "Quality Assurance Office", status: "ACTIVE", version: "1.0" },
    repositoryNames: ["MRC Form 4", "MRC-Form-4"],
    fields: [text("YEAR", "Calendar year", true), rows([{ key: "function_area", label: "Function / area" }, { key: "objectives", label: "Objectives" }, { key: "strategies", label: "Strategies" }, { key: "time_frame", label: "Time frame" }, { key: "persons", label: "Persons involved" }, { key: "budget", label: "Budget" }, { key: "expected_output", label: "Expected output" }, { key: "actual_accomplishment", label: "Actual accomplishment" }, { key: "remarks", label: "Remarks" }]), person("PREPARED_BY", "Prepared by"), person("VP_ADMIN", "VP Administration"), person("VP_RD", "VP Research and Development"), person("VP_ACAD", "VP Academic Affairs"), person("VP_PEBA", "VP Production, Extension and Business Affairs"), person("APPROVED_BY", "Approved by")],
    allowedPlaceholders: ["YEAR", "LOGSHEET_ROWS", "PREPARED_BY", "VP_ADMIN", "VP_RD", "VP_ACAD", "VP_PEBA", "APPROVED_BY"],
  },
  {
    metadata: { code: "MRC_FORM_5", name: "Risk Identification", formNumber: "MRC Form 5", revision: "0", effectiveDate: "2021-03-01", pageSize: "letter", orientation: "landscape", owningOffice: "Quality Assurance Office", status: "ACTIVE", version: "1.0" },
    repositoryNames: ["MRC Form 5", "MRC-Form-5"],
    fields: [text("UNIT_NAME", "College / department / unit", true), text("OBJECTIVE_TEXT", "Objective", true), rows([{ key: "issues", label: "Issues" }, { key: "risks", label: "Risks" }, { key: "impact", label: "Impact" }, { key: "likelihood", label: "Likelihood" }, { key: "risk_factor", label: "Risk factor" }, { key: "action", label: "Risk control / action" }, { key: "target_date", label: "Target date" }, { key: "responsible", label: "Persons responsible" }, { key: "assessment_date", label: "Assessment date" }, { key: "completion_date", label: "Completion date" }]), ...signatureFields],
    allowedPlaceholders: ["UNIT_NAME", "OBJECTIVE_TEXT", "LOGSHEET_ROWS", "PREPARED_BY", "REVIEWED_BY", "APPROVED_BY"],
  },
  {
    metadata: { code: "MRC_FORM_6", name: "Opportunities Identification", formNumber: "MRC Form 6", revision: "0", effectiveDate: "2021-03-01", pageSize: "letter", orientation: "landscape", owningOffice: "Quality Assurance Office", status: "ACTIVE", version: "1.0" },
    repositoryNames: ["MRC Form 6", "MRC-Form-6"],
    fields: [text("UNIT_NAME", "College / department / unit", true), rows([{ key: "opportunity", label: "Opportunity" }, { key: "action_plan", label: "Action plan" }, { key: "target_date", label: "Target date" }, { key: "responsible", label: "Persons responsible" }, { key: "assessment_date", label: "Assessment date" }, { key: "completion_date", label: "Completion date" }]), ...signatureFields],
    allowedPlaceholders: ["UNIT_NAME", "LOGSHEET_ROWS", "PREPARED_BY", "REVIEWED_BY", "APPROVED_BY"],
  },
  {
    metadata: { code: "MRC_FORM_7", name: "Relevant Issues Log", formNumber: "MRC Form 7", revision: "0", effectiveDate: "2021-03-01", pageSize: "letter", orientation: "landscape", owningOffice: "Quality Assurance Office", status: "ACTIVE", version: "1.0" },
    repositoryNames: ["MRC Form 7", "MRC-Form-7"],
    fields: [rows([{ key: "interested_parties", label: "Interested parties" }, { key: "context", label: "Internal / external" }, { key: "inclusion_reason", label: "Reason for inclusion" }, { key: "issues", label: "Issues of concern" }, { key: "processes", label: "Processes affected" }, { key: "priority", label: "Priority" }, { key: "treatment", label: "Treatment method" }, { key: "notes", label: "Records / notes" }]), person("PREPARED_BY", "Prepared by", true), person("APPROVED_BY", "Approved by", true)],
    allowedPlaceholders: ["LOGSHEET_ROWS", "PREPARED_BY", "APPROVED_BY"],
  },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function findTemplateSchema(repositoryName: string): TemplateSchema | undefined {
  const target = normalize(repositoryName);
  return TEMPLATE_SCHEMAS.find((schema) =>
    schema.repositoryNames.some((name) => {
      const candidate = normalize(name);
      return target === candidate || target.includes(candidate) || candidate.includes(target);
    }),
  );
}

export function dynamicTemplateSchema(template: { name: string; version?: string; office?: string; template_code?: string; template_revision?: string; page_size?: string; orientation?: string; field_schema?: TemplateFieldDefinition[] }): TemplateSchema | undefined {
  if (!template.template_code || !template.field_schema?.length) return undefined;
  return {
    metadata: {
      code: template.template_code,
      name: template.name,
      revision: template.template_revision || "0",
      pageSize: template.page_size === "a4" || template.page_size === "legal" ? template.page_size : "letter",
      orientation: template.orientation === "landscape" ? "landscape" : "portrait",
      owningOffice: template.office || "Quality Assurance Office",
      status: "ACTIVE",
      version: template.version || "1.0",
    },
    repositoryNames: [template.name],
    fields: template.field_schema,
    allowedPlaceholders: template.field_schema.map((field) => field.key),
  };
}
