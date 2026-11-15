export type TemplateFieldType =
  | "text"
  | "multiline"
  | "date"
  | "time"
  | "person"
  | "select"
  | "checkbox"
  | "repeatable-text"
  | "repeatable-table";

export type TemplateOrientation = "portrait" | "landscape";
export type TemplatePageSize = "letter" | "a4" | "legal";
export type TemplateLifecycleStatus = "ACTIVE" | "SUPERSEDED" | "ARCHIVED";

export interface TemplateMetadata {
  code: string;
  name: string;
  formNumber?: string;
  revision: string;
  effectiveDate?: string;
  pageSize: TemplatePageSize;
  orientation: TemplateOrientation;
  owningOffice: string;
  status: TemplateLifecycleStatus;
  version: string;
}

export interface TemplateTableColumn {
  key: string;
  label: string;
  type?: Exclude<TemplateFieldType, "repeatable-text" | "repeatable-table">;
  required?: boolean;
}

export interface TemplateFieldDefinition {
  key: string;
  label: string;
  type: TemplateFieldType;
  placeholder?: string;
  placeholders?: string[];
  required?: boolean;
  controlled?: boolean;
  helpText?: string;
  options?: Array<{ label: string; value: string }>;
  columns?: TemplateTableColumn[];
  minimumRows?: number;
  maximumRows?: number;
  rowTemplate?: string;
}

export interface TemplateSchema {
  metadata: TemplateMetadata;
  repositoryNames: string[];
  fields: TemplateFieldDefinition[];
  allowedPlaceholders: string[];
}

export type TemplateScalarValue = string | boolean;
export type TemplateRepeatableTextValue = string[];
export type TemplateTableRowValue = Record<string, string>;
export type TemplateFieldValue =
  | TemplateScalarValue
  | TemplateRepeatableTextValue
  | TemplateTableRowValue[];
export type TemplateValueMap = Record<string, TemplateFieldValue>;

export interface RepositoryTemplate {
  name: string;
  category: string;
  office?: string;
  version?: string;
  effectivity_date?: string;
  status?: string;
  has_content_html?: boolean;
  template_code?: string;
  template_revision?: string;
  page_size?: string;
  orientation?: string;
  field_schema?: TemplateFieldDefinition[];
}

export interface TemplateCompatibilityIssue {
  level: "error" | "warning";
  code: "NO_SCHEMA" | "MISSING_PLACEHOLDER" | "UNSUPPORTED_PLACEHOLDER" | "MISSING_METADATA";
  message: string;
  placeholder?: string;
}

export interface TemplateValidationResult {
  valid: boolean;
  placeholders: string[];
  issues: TemplateCompatibilityIssue[];
}
