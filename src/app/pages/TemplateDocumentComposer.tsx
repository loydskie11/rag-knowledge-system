import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, FileImage, FileText, LockKeyhole, Plus, Printer, RotateCcw, Save, Sparkles, Trash2, X } from "lucide-react";
import apiClient from "@/app/api/client";
import { useRole } from "@/app/contexts/RoleContext";
import { TemplatePreview } from "@/app/features/document-composer/TemplatePreview";
import { dynamicTemplateSchema, findTemplateSchema } from "@/app/features/document-composer/templateSchemas";
import { addLetterheadImages, extractTemplatePlaceholders, preparePrintableTemplateHtml, renderTemplateHtml, sanitizeTemplateHtml, validateTemplateCompatibility } from "@/app/features/document-composer/templateSecurity";
import { addCarGenerationProvenance, mapCarReportToTemplate, type CarReportPayload } from "@/app/features/document-composer/carForm1";
import { addCarMasterLogProvenance, mapCarMasterLogToTemplate, type CarMasterLogRecord } from "@/app/features/document-composer/carForm3";
import type { RepositoryTemplate, TemplateFieldDefinition, TemplateTableRowValue, TemplateValueMap } from "@/app/features/document-composer/types";

function initialValues(fields: TemplateFieldDefinition[]): TemplateValueMap {
  return Object.fromEntries(fields.map((field) => {
    if (field.type === "repeatable-text") return [field.key, Array.from({ length: field.minimumRows || 1 }, () => "")];
    if (field.type === "repeatable-table") return [field.key, Array.from({ length: field.minimumRows || 1 }, () => Object.fromEntries((field.columns || []).map((column) => [column.key, ""])))];
    if (field.type === "checkbox") return [field.key, false];
    return [field.key, ""];
  }));
}

interface GeneratedDocumentRecord {
  id: string;
  title: string;
  template_name: string;
  template_code: string;
  template_version: string;
  status: "DRAFT" | "FINALIZED" | "SUPERSEDED" | "VOIDED";
  field_values: TemplateValueMap;
  rendered_html: string;
  source_type: string;
  source_id?: string | null;
  source_reference?: string | null;
  updated_at?: string;
}

export function TemplateDocumentComposer() {
  const { profile, assignments } = useRole();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const routedState = location.state as { composerTemplate?: string; composerValues?: TemplateValueMap; sourceReference?: string } | null;
  const carId = searchParams.get("carId") || "";
  const carLogCycle = searchParams.get("carLogCycle") || "";
  const requestedTemplate = searchParams.get("template") || "";
  const sourceReference = searchParams.get("sourceReference") || routedState?.sourceReference || "";
  const previewRef = useRef<HTMLIFrameElement>(null);
  const routedDraftLoaded = useRef(false);
  const [templates, setTemplates] = useState<RepositoryTemplate[]>([]);
  const [selectedName, setSelectedName] = useState("");
  const [sourceHtml, setSourceHtml] = useState("");
  const [values, setValues] = useState<TemplateValueMap>({});
  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [error, setError] = useState("");
  const [carReport, setCarReport] = useState<CarReportPayload | null>(null);
  const [carReportLoading, setCarReportLoading] = useState(Boolean(carId));
  const [carMasterLog, setCarMasterLog] = useState<CarMasterLogRecord[] | null>(null);
  const [carMasterLogLoading, setCarMasterLogLoading] = useState(Boolean(carLogCycle));
  const [headerImage, setHeaderImage] = useState("");
  const [footerImage, setFooterImage] = useState("");
  const [imageError, setImageError] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiDrafted, setAiDrafted] = useState(false);
  const [savedDocuments, setSavedDocuments] = useState<GeneratedDocumentRecord[]>([]);
  const [activeDocument, setActiveDocument] = useState<GeneratedDocumentRecord | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentSaving, setDocumentSaving] = useState(false);
  const [documentMessage, setDocumentMessage] = useState("");
  const canManageTemplates = profile?.role === "SYSTEM_ADMIN" || assignments.some((assignment) => assignment.assignment_type === "DOCUMENT_CONTROLLER");
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [managedTemplates, setManagedTemplates] = useState<any[]>([]);
  const [templateAdminBusy, setTemplateAdminBusy] = useState(false);
  const [templateAdminMessage, setTemplateAdminMessage] = useState("");
  const [templateMode, setTemplateMode] = useState<"version" | "new">("version");
  const [templateDraft, setTemplateDraft] = useState<{ name: string; template_code: string; version: string; revision: string; orientation: string; page_size: string; content_html: string; field_schema: TemplateFieldDefinition[]; is_new_type: boolean }>({ name: "", template_code: "", version: "1.0", revision: "0", orientation: "portrait", page_size: "short", content_html: "", field_schema: [], is_new_type: false });
  const [templateValidation, setTemplateValidation] = useState<any>(null);
  const [templateFileName, setTemplateFileName] = useState("");
  const [templateConversionWarnings, setTemplateConversionWarnings] = useState<string[]>([]);
  const [managerPreviewHtml, setManagerPreviewHtml] = useState("");
  const [previewedTemplateId, setPreviewedTemplateId] = useState("");
  const availableTemplateCodes = useMemo(() => Array.from(new Set(["MEMORANDUM", "CAR_FORM_1", "CAR_FORM_3", "MRC_FORM_2", "MRC_FORM_3", "MRC_FORM_4", "MRC_FORM_5", "MRC_FORM_6", "MRC_FORM_7", ...managedTemplates.map((item) => item.template_code).filter(Boolean)])), [managedTemplates]);

  const selectedTemplate = templates.find((template) => template.name === selectedName);
  const documentLocked = Boolean(activeDocument && activeDocument.status !== "DRAFT");
  const schema = useMemo(() => selectedName ? findTemplateSchema(selectedName) || (selectedTemplate ? dynamicTemplateSchema(selectedTemplate) : undefined) : undefined, [selectedName, selectedTemplate]);
  const compatibility = useMemo(() => sourceHtml ? validateTemplateCompatibility(sourceHtml, schema) : null, [sourceHtml, schema]);
  const missingRequiredFields = useMemo(() => schema ? schema.fields.filter((field) => {
    if (!field.required) return false;
    const value = values[field.key];
    if (typeof value === "boolean") return !value;
    if (typeof value === "string") return !value.trim();
    if (Array.isArray(value)) {
      return value.length === 0 || value.every((entry) => typeof entry === "string"
        ? !entry.trim()
        : Object.values(entry).every((cell) => !String(cell || "").trim()));
    }
    return true;
  }) : [], [schema, values]);
  const renderedHtml = useMemo(() => {
    if (!sourceHtml) return sanitizeTemplateHtml("<html><body><p>Select an approved template to begin.</p></body></html>");
    const rendered = schema ? renderTemplateHtml(sourceHtml, schema, values) : sanitizeTemplateHtml(sourceHtml);
    let finalHtml = rendered;
    if (schema?.metadata.code === "CAR_FORM_1" && carReport) finalHtml = addCarGenerationProvenance(finalHtml, carReport, selectedTemplate?.version || schema.metadata.version);
    if (schema?.metadata.code === "CAR_FORM_3" && carMasterLog) finalHtml = addCarMasterLogProvenance(finalHtml, carLogCycle, carMasterLog.length, selectedTemplate?.version || schema.metadata.version);
    const withLetterhead = addLetterheadImages(finalHtml, headerImage, footerImage);
    return schema ? preparePrintableTemplateHtml(withLetterhead, schema.metadata.pageSize, schema.metadata.orientation) : withLetterhead;
  }, [sourceHtml, schema, values, carReport, carMasterLog, carLogCycle, selectedTemplate?.version, headerImage, footerImage]);

  useEffect(() => {
    let active = true;
    apiClient.get("/documents", { params: { category: "Forms / Templates" } })
      .then(({ data }) => {
        if (!active) return;
        const records = Array.isArray(data) ? data : [];
        setTemplates(records.filter((item) => item.category === "Forms / Templates" && (!item.status || item.status === "Active")));
      })
      .catch(() => active && setError("The approved template library could not be loaded."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const refreshSavedDocuments = async () => {
    try {
      const { data } = await apiClient.get("/generated-documents");
      setSavedDocuments(Array.isArray(data) ? data : []);
    } catch { setSavedDocuments([]); }
  };

  useEffect(() => { void refreshSavedDocuments(); }, []);

  const refreshManagedTemplates = async () => {
    if (!canManageTemplates) return;
    try { const { data } = await apiClient.get("/document-templates/manage"); setManagedTemplates(Array.isArray(data) ? data : []); }
    catch (requestError: any) { setError(requestError?.response?.data?.detail || "Template versions could not be loaded."); }
  };

  useEffect(() => { if (showTemplateManager) void refreshManagedTemplates(); }, [showTemplateManager, canManageTemplates]);

  const validateManagedTemplate = async () => {
    if (!templateDraft.content_html) { setError("Choose an HTML template file first."); return; }
    setTemplateAdminBusy(true); setError(""); setTemplateAdminMessage("");
    try {
      const { data } = await apiClient.post("/document-templates/validate", { template_code: templateDraft.template_code, content_html: templateDraft.content_html });
      setTemplateValidation(data); setManagerPreviewHtml(templateDraft.content_html); setPreviewedTemplateId("");
      setTemplateAdminMessage(data.missing_placeholders?.length ? `Preview ready. ${data.missing_placeholders.length} declared placeholder(s) are not used.` : "Template is compatible and ready to save as a draft version.");
    } catch (requestError: any) { setTemplateValidation(null); setManagerPreviewHtml(""); setError(requestError?.response?.data?.detail?.message || requestError?.response?.data?.detail || "Template validation failed."); }
    finally { setTemplateAdminBusy(false); }
  };

  const applyImportedTemplate = (content_html: string, file: File, warnings: string[] = []) => {
    const detected = extractTemplatePlaceholders(content_html);
    const field_schema: TemplateFieldDefinition[] = detected.map((key) => ({
      key,
      label: key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      type: /date/i.test(key) ? "date" : /time/i.test(key) ? "time" : /name|by|officer|person/i.test(key) ? "person" : /description|remarks|body|findings|details|purpose/i.test(key) ? "multiline" : "text",
      placeholder: `[${key}]`,
      required: false,
      controlled: false,
    }));
    const suggestedName = file.name.replace(/\.(html?|docx|pdf)$/i, "").replaceAll(/[-_]+/g, " ").trim();
    setTemplateDraft((current) => ({ ...current, name: current.name || suggestedName, content_html, field_schema: templateMode === "new" ? field_schema : [] }));
    setTemplateConversionWarnings(warnings);
    setTemplateValidation(null); setManagerPreviewHtml("");
    setTemplateAdminMessage(templateMode === "new" ? `${detected.length} editable field(s) detected. Review their labels and types below.` : "Template imported. Check and preview it before saving.");
  };

  const loadManagedTemplateFile = async (file?: File) => {
    if (!file) return;
    setTemplateFileName(file.name);
    setTemplateAdminBusy(true); setError(""); setTemplateAdminMessage("Importing and preparing the template…"); setTemplateConversionWarnings([]);
    try {
      if (/\.html?$/i.test(file.name)) {
        applyImportedTemplate(await file.text(), file);
      } else {
        const form = new FormData(); form.append("file", file);
        const { data } = await apiClient.post("/document-templates/convert", form);
        applyImportedTemplate(String(data?.content_html || ""), file, Array.isArray(data?.warnings) ? data.warnings : []);
      }
    } catch (requestError: any) {
      setTemplateFileName(""); setTemplateAdminMessage("");
      setError(requestError?.response?.data?.detail || "The template file could not be imported.");
    } finally { setTemplateAdminBusy(false); }
  };

  const updateDynamicField = (index: number, changes: Partial<TemplateFieldDefinition>) => {
    setTemplateDraft((current) => ({ ...current, field_schema: current.field_schema.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...changes } : field) }));
    setTemplateValidation(null);
  };

  const saveTemplateVersion = async () => {
    if (!templateValidation?.valid) { setError("Validate and preview the template before saving it."); return; }
    setTemplateAdminBusy(true); setError("");
    try {
      await apiClient.post("/document-templates", templateDraft);
      setTemplateAdminMessage("Template version saved as Draft. Preview it from the version list before activation.");
      setTemplateValidation(null); setManagerPreviewHtml("");
      await refreshManagedTemplates();
    } catch (requestError: any) { setError(requestError?.response?.data?.detail || "Template version could not be saved."); }
    finally { setTemplateAdminBusy(false); }
  };

  const previewManagedVersion = async (template: any) => {
    try {
      const { data } = await apiClient.get(`/documents/${encodeURIComponent(template.repository_name)}/content`);
      setManagerPreviewHtml(data?.content_html || ""); setPreviewedTemplateId(template.id); setTemplateAdminMessage(`Previewing ${template.name} version ${template.version}.`);
    } catch { setError("The selected template preview could not be loaded."); }
  };

  const changeManagedTemplateStatus = async (template: any, action: "activate" | "archive") => {
    if (action === "activate" && previewedTemplateId !== template.id) { setError("Preview this exact template version before activating it."); return; }
    setTemplateAdminBusy(true); setError("");
    try {
      const { data } = await apiClient.post(`/document-templates/${template.id}/${action}`);
      setTemplateAdminMessage(data?.message || "Template status updated."); setPreviewedTemplateId(""); setManagerPreviewHtml("");
      await refreshManagedTemplates();
      const docs = await apiClient.get("/documents", { params: { category: "Forms / Templates" } });
      setTemplates((Array.isArray(docs.data) ? docs.data : []).filter((item: any) => item.category === "Forms / Templates" && (!item.status || item.status === "Active")));
    } catch (requestError: any) { setError(requestError?.response?.data?.detail || "Template status could not be changed."); }
    finally { setTemplateAdminBusy(false); }
  };

  useEffect(() => {
    if (!carId) return;
    let active = true;
    setCarReportLoading(true);
    apiClient.get(`/car-forms/${encodeURIComponent(carId)}/report-data`)
      .then(({ data }) => { if (active) setCarReport(data); })
      .catch((requestError) => {
        if (!active) return;
        const detail = requestError?.response?.data?.detail;
        setError(detail || "The controlled CAR record could not be loaded.");
      })
      .finally(() => { if (active) setCarReportLoading(false); });
    return () => { active = false; };
  }, [carId]);

  useEffect(() => {
    if (!carLogCycle) return;
    let active = true;
    setCarMasterLogLoading(true);
    apiClient.get("/car-reports/master-log", { params: { cycle_year: carLogCycle } })
      .then(({ data }) => { if (active) setCarMasterLog(Array.isArray(data) ? data : []); })
      .catch((requestError) => { if (active) setError(requestError?.response?.data?.detail || "The controlled CAR master log could not be loaded."); })
      .finally(() => { if (active) setCarMasterLogLoading(false); });
    return () => { active = false; };
  }, [carLogCycle]);

  const chooseTemplate = async (name: string) => {
    setSelectedName(name);
    setSourceHtml("");
    setError("");
    if (!name) { setValues({}); return; }
    const repositoryTemplate = templates.find((template) => template.name === name);
    const nextSchema = findTemplateSchema(name) || (repositoryTemplate ? dynamicTemplateSchema(repositoryTemplate) : undefined);
    setValues(nextSchema ? initialValues(nextSchema.fields) : {});
    setTemplateLoading(true);
    try {
      const { data } = await apiClient.get(`/documents/${encodeURIComponent(name)}/content`);
      if (!data?.content_html?.trim()) throw new Error("This template has no editable HTML representation.");
      setSourceHtml(data.content_html);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The selected template could not be opened.");
    } finally {
      setTemplateLoading(false);
    }
  };

  useEffect(() => {
    if (!carId || loading || selectedName) return;
    const carTemplate = templates.find((template) => findTemplateSchema(template.name)?.metadata.code === "CAR_FORM_1");
    if (carTemplate) chooseTemplate(carTemplate.name);
    else if (templates.length >= 0) setError("CAR Form 1 Template is not available in the Knowledge Repository. Upload the approved HTML template under Forms / Templates before generating this controlled form.");
  }, [carId, loading, selectedName, templates]);

  useEffect(() => {
    if (!requestedTemplate || loading || selectedName) return;
    const requested = templates.find((template) => template.name === requestedTemplate || findTemplateSchema(template.name)?.metadata.code === requestedTemplate);
    if (requested) void chooseTemplate(requested.name);
    else setError("The requested approved template is not available in the Knowledge Repository.");
  }, [requestedTemplate, loading, selectedName, templates]);

  useEffect(() => {
    const routed = routedState;
    if (routedDraftLoaded.current || loading || selectedName || !routed?.composerTemplate) return;
    const target = templates.find((template) => template.name === routed.composerTemplate || findTemplateSchema(template.name)?.metadata.code === routed.composerTemplate);
    if (!target) { setError("The requested approved template is not available in the Knowledge Repository."); routedDraftLoaded.current = true; return; }
    routedDraftLoaded.current = true;
    void chooseTemplate(target.name).then(() => {
      if (routed.composerValues) setValues((current) => ({ ...current, ...routed.composerValues }));
    });
  }, [location.state, loading, selectedName, templates]);

  useEffect(() => {
    if (!carLogCycle || loading || selectedName) return;
    const logTemplate = templates.find((template) => findTemplateSchema(template.name)?.metadata.code === "CAR_FORM_3");
    if (logTemplate) chooseTemplate(logTemplate.name);
    else setError("CAR Form 3 Template is not available in the Knowledge Repository.");
  }, [carLogCycle, loading, selectedName, templates]);

  useEffect(() => {
    if (!carReport || schema?.metadata.code !== "CAR_FORM_1") return;
    setValues({ ...initialValues(schema.fields), ...mapCarReportToTemplate(carReport) });
  }, [carReport, schema]);

  useEffect(() => {
    if (!carMasterLog || schema?.metadata.code !== "CAR_FORM_3") return;
    setValues({ ...initialValues(schema.fields), ...mapCarMasterLogToTemplate(carLogCycle, carMasterLog) });
  }, [carMasterLog, carLogCycle, schema]);

  useEffect(() => {
    if (schema?.metadata.code !== "MEMORANDUM" || !profile) return;
    const primary = assignments.find((assignment) => assignment.is_primary) || assignments[0];
    const senderOffice = primary?.scope_name || sessionStorage.getItem("userAdministrativeOffice") || "CTU Argao Campus";
    const senderTitle = primary?.assignment_type?.replaceAll("_", " ") || (profile.role === "SYSTEM_ADMIN" ? "System Administrator" : "Personnel");
    setValues((current) => ({ ...current, "SENDER OFFICE": senderOffice, "Sender Name": profile.full_name || profile.email, "Sender Title": senderTitle, Date: typeof current.Date === "string" && current.Date ? current.Date : new Date().toISOString().slice(0, 10), "Current Year": typeof current["Current Year"] === "string" && current["Current Year"] ? current["Current Year"] : String(new Date().getFullYear()) }));
  }, [schema, profile, assignments]);

  const loadLetterhead = (file: File | undefined, target: "header" | "footer") => {
    setImageError("");
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setImageError("Use a PNG, JPEG, or WebP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setImageError("Header and footer images must not exceed 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => target === "header" ? setHeaderImage(String(reader.result || "")) : setFooterImage(String(reader.result || ""));
    reader.onerror = () => setImageError("The selected image could not be read.");
    reader.readAsDataURL(file);
  };

  const draftMemoBody = async () => {
    if (!aiPrompt.trim()) { setError("Describe what the memorandum should communicate before drafting."); return; }
    setAiDrafting(true); setError("");
    try {
      const { data } = await apiClient.post("/generate-document", { prompt: `Draft only the body of an official Cebu Technological University memorandum. Do not add a header, recipient list, subject line, or signature. Instructions: ${aiPrompt.trim()}`, temperature: 0.2 });
      setScalar("Memo Body", String(data?.content || ""));
      setAiDrafted(true);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || "The AI draft could not be generated.");
    } finally { setAiDrafting(false); }
  };

  const printDocument = async () => {
    const frameWindow = previewRef.current?.contentWindow;
    if (!frameWindow) { setError("The document preview is not ready to print."); return; }
    const frameDocument = frameWindow.document;
    try {
      await frameDocument.fonts?.ready;
      await Promise.all(Array.from(frameDocument.images).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })));
    } catch { /* Printing can continue with browser fallback fonts. */ }
    frameDocument.title = documentTitle.trim() || schema?.metadata.name || "CTU Document";
    frameWindow.focus();
    await new Promise<void>((resolve) => frameWindow.requestAnimationFrame(() => resolve()));
    frameWindow.print();
  };

  const generatedDocumentPayload = () => ({
    title: documentTitle.trim() || `${schema?.metadata.name || selectedName} Draft`,
    template_name: selectedName,
    template_code: schema?.metadata.code || "UNSCHEMATIZED",
    template_version: selectedTemplate?.version || schema?.metadata.version || "1.0",
    field_values: { ...values, __composer_header_image: headerImage, __composer_footer_image: footerImage, __composer_ai_drafted: aiDrafted },
    rendered_html: renderedHtml,
    source_type: carId ? "CAR_FORM" : carLogCycle ? "CAR_MASTER_LOG" : schema?.metadata.code.startsWith("MRC_FORM_") && sourceReference ? "MRC_RECORD" : "NONE",
    source_id: carId || null,
    source_reference: carLogCycle || sourceReference || null,
  });

  const saveDraft = async () => {
    if (!schema || !selectedName) { setError("Select an approved template before saving a draft."); return null; }
    if (documentLocked) { setError("Finalized, superseded, and voided documents cannot be edited."); return null; }
    setDocumentSaving(true); setError(""); setDocumentMessage("");
    try {
      const payload = generatedDocumentPayload();
      const { data } = activeDocument
        ? await apiClient.put(`/generated-documents/${activeDocument.id}`, { title: payload.title, field_values: payload.field_values, rendered_html: payload.rendered_html })
        : await apiClient.post("/generated-documents", payload);
      setActiveDocument(data); setDocumentTitle(data.title); setDocumentMessage("Draft saved.");
      await refreshSavedDocuments();
      return data as GeneratedDocumentRecord;
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || "The draft could not be saved.");
      return null;
    } finally { setDocumentSaving(false); }
  };

  const finalizeDocument = async () => {
    if (missingRequiredFields.length) { setError(`Complete ${missingRequiredFields.map((field) => field.label).join(", ")} before finalizing.`); return; }
    const draft = await saveDraft();
    if (!draft) return;
    setDocumentSaving(true);
    try {
      const { data } = await apiClient.post(`/generated-documents/${draft.id}/finalize`);
      setActiveDocument(data); setDocumentMessage("Document finalized. This version is now read-only.");
      await refreshSavedDocuments();
    } catch (requestError: any) { setError(requestError?.response?.data?.detail || "The document could not be finalized."); }
    finally { setDocumentSaving(false); }
  };

  const openSavedDocument = async (document: GeneratedDocumentRecord) => {
    setError(""); setDocumentMessage("");
    await chooseTemplate(document.template_name);
    const stored = { ...(document.field_values || {}) } as TemplateValueMap;
    const storedHeader = typeof stored.__composer_header_image === "string" ? stored.__composer_header_image : "";
    const storedFooter = typeof stored.__composer_footer_image === "string" ? stored.__composer_footer_image : "";
    const storedAiDrafted = stored.__composer_ai_drafted === true;
    delete stored.__composer_header_image; delete stored.__composer_footer_image; delete stored.__composer_ai_drafted;
    setValues(stored); setHeaderImage(storedHeader); setFooterImage(storedFooter); setAiDrafted(storedAiDrafted);
    setDocumentTitle(document.title); setActiveDocument(document);
  };

  const reopenDocument = async () => {
    if (!activeDocument || activeDocument.status !== "FINALIZED") return;
    setDocumentSaving(true);
    try {
      const { data } = await apiClient.post(`/generated-documents/${activeDocument.id}/reopen`);
      setActiveDocument(data); setDocumentTitle(data.title);
      await openSavedDocument(data);
      setDocumentMessage("A new editable draft was created; the finalized version was preserved as superseded.");
      await refreshSavedDocuments();
    } catch (requestError: any) { setError(requestError?.response?.data?.detail || "The finalized document could not be reopened."); }
    finally { setDocumentSaving(false); }
  };

  const setScalar = (key: string, value: string | boolean) => setValues((current) => ({ ...current, [key]: value }));
  const setTextEntry = (key: string, index: number, value: string) => setValues((current) => {
    const entries = Array.isArray(current[key]) ? [...current[key] as string[]] : [];
    entries[index] = value;
    return { ...current, [key]: entries };
  });
  const setTableCell = (key: string, index: number, column: string, value: string) => setValues((current) => {
    const rows = Array.isArray(current[key]) ? [...current[key] as TemplateTableRowValue[]] : [];
    rows[index] = { ...(rows[index] || {}), [column]: value };
    return { ...current, [key]: rows };
  });
  const addRow = (field: TemplateFieldDefinition) => setValues((current) => {
    const currentRows = Array.isArray(current[field.key]) ? [...current[field.key] as Array<string | TemplateTableRowValue>] : [];
    if (currentRows.length >= (field.maximumRows || 100)) return current;
    const next = field.type === "repeatable-text" ? "" : Object.fromEntries((field.columns || []).map((column) => [column.key, ""]));
    return { ...current, [field.key]: [...currentRows, next] as string[] | TemplateTableRowValue[] };
  });
  const removeRow = (field: TemplateFieldDefinition, index: number) => setValues((current) => {
    const currentRows = Array.isArray(current[field.key]) ? [...current[field.key] as Array<string | TemplateTableRowValue>] : [];
    if (currentRows.length <= (field.minimumRows || 0)) return current;
    currentRows.splice(index, 1);
    return { ...current, [field.key]: currentRows as string[] | TemplateTableRowValue[] };
  });

  return (
    <div className="mx-auto max-w-[1700px] space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">Official documents</p>
          <h1 className="text-2xl font-bold text-gray-950">Document Generator</h1>
          <p className="mt-1 text-sm text-gray-500">Choose an approved form, complete its fields, and review the document before finalizing.</p>
        </div>
        {profile?.role === "SYSTEM_ADMIN" && <Link to="/app/document-generator" className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"><ArrowLeft className="h-4 w-4" /> Legacy fallback</Link>}
      </div>

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="mb-2 block text-sm font-semibold text-gray-800">Document template</label>
            <select value={selectedName} onChange={(event) => { setActiveDocument(null); setDocumentTitle(""); setDocumentMessage(""); void chooseTemplate(event.target.value); }} disabled={loading} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100">
              <option value="">{loading ? "Loading templates…" : "Select a template"}</option>
              {templates.map((template) => <option key={template.name} value={template.name}>{template.name}</option>)}
            </select>
            {selectedTemplate && (
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div><dt className="text-gray-500">Version</dt><dd className="mt-0.5 font-semibold text-gray-800">{selectedTemplate.version || "Not specified"}</dd></div>
                <div><dt className="text-gray-500">Office</dt><dd className="mt-0.5 font-semibold text-gray-800">{selectedTemplate.office || "Not specified"}</dd></div>
              </dl>
            )}
          </section>

          {canManageTemplates && <button type="button" aria-expanded={showTemplateManager} aria-controls="template-management-panel" onClick={() => setShowTemplateManager((current) => !current)} className={`flex h-10 w-full items-center justify-between rounded-lg border px-3 text-xs font-semibold transition-colors ${showTemplateManager ? "border-[#DD7230] bg-[#DD7230] text-white hover:bg-[#c86427]" : "border-gray-300 bg-white text-gray-700 hover:border-[#DD7230]/50 hover:bg-orange-50/40"}`}><span>{showTemplateManager ? "Template management is open" : "Manage templates"}</span>{showTemplateManager ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>}

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-gray-900">Saved documents</h2><span className="text-xs text-gray-500">{savedDocuments.length}</span></div>
            {savedDocuments.length ? <div className="max-h-52 space-y-2 overflow-auto">{savedDocuments.map((document) => <button key={document.id} type="button" onClick={() => openSavedDocument(document)} className={`w-full rounded-lg border px-3 py-2 text-left ${activeDocument?.id === document.id ? "border-gray-700 bg-gray-50" : "border-gray-200 hover:bg-gray-50"}`}><span className="block truncate text-xs font-semibold text-gray-800">{document.title}</span><span className="mt-0.5 block text-[11px] text-gray-500">{document.status} · {document.template_code}</span></button>)}</div> : <p className="text-xs text-gray-500">No saved drafts or finalized documents yet.</p>}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2"><FileImage className="h-4 w-4 text-gray-500" /><h2 className="text-sm font-semibold text-gray-900">Header and footer images</h2></div>
            <p className="mb-3 text-xs text-gray-500">Optional images are added to the generated copy and included when printing.</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><label className="flex-1 cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700 hover:bg-gray-50"><input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { loadLetterhead(event.target.files?.[0], "header"); event.target.value = ""; }} />{headerImage ? "Replace header" : "Upload header"}</label>{headerImage && <button type="button" aria-label="Remove header image" onClick={() => setHeaderImage("")} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"><X className="h-3.5 w-3.5" /></button>}</div>
              <div className="flex items-center gap-2"><label className="flex-1 cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-center text-xs font-semibold text-gray-700 hover:bg-gray-50"><input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { loadLetterhead(event.target.files?.[0], "footer"); event.target.value = ""; }} />{footerImage ? "Replace footer" : "Upload footer"}</label>{footerImage && <button type="button" aria-label="Remove footer image" onClick={() => setFooterImage("")} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"><X className="h-3.5 w-3.5" /></button>}</div>
            </div>
            {imageError && <p className="mt-2 text-xs text-rose-700">{imageError}</p>}
          </section>

          {schema && (
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-gray-500" /><h2 className="text-sm font-semibold text-gray-900">Template details</h2></div>
              <dl className="space-y-2 text-xs">
                <div><dt className="text-gray-500">Document type</dt><dd className="font-semibold text-gray-800">{schema.metadata.code.replaceAll("_", " ")}</dd></div>
                <div><dt className="text-gray-500">Form / revision</dt><dd className="font-semibold text-gray-800">{schema.metadata.formNumber || schema.metadata.name} · Rev. {schema.metadata.revision}</dd></div>
                <div><dt className="text-gray-500">Owner</dt><dd className="font-semibold text-gray-800">{schema.metadata.owningOffice}</dd></div>
                <div><dt className="text-gray-500">Page</dt><dd className="font-semibold capitalize text-gray-800">{schema.metadata.pageSize} · {schema.metadata.orientation}</dd></div>
              </dl>
            </section>
          )}

          {carReport && schema?.metadata.code === "CAR_FORM_1" && (
            <section className="rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-700 shadow-sm">
              <p className="font-semibold">Controlled CAR source</p>
              <dl className="mt-2 space-y-1">
                <div><dt className="inline text-gray-500">CAR: </dt><dd className="inline font-semibold text-gray-900">{carReport.car.car_no}</dd></div>
                <div><dt className="inline text-gray-500">Record ID: </dt><dd className="inline break-all">{carReport.car.id}</dd></div>
                <div><dt className="inline text-gray-500">Template: </dt><dd className="inline">{selectedTemplate?.version || schema.metadata.version}</dd></div>
              </dl>
            </section>
          )}

          {carMasterLog && schema?.metadata.code === "CAR_FORM_3" && (
            <section className="rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-700 shadow-sm">
              <p className="font-semibold">Controlled CAR master log</p>
              <dl className="mt-2 space-y-1">
                <div><dt className="inline text-gray-500">Audit cycle: </dt><dd className="inline font-semibold text-gray-900">{carLogCycle}</dd></div>
                <div><dt className="inline text-gray-500">CAR records: </dt><dd className="inline">{carMasterLog.length}</dd></div>
                <div><dt className="inline text-gray-500">Template: </dt><dd className="inline">{selectedTemplate?.version || schema.metadata.version}</dd></div>
              </dl>
            </section>
          )}

          {compatibility && (
            <section className={`rounded-2xl border bg-white p-4 shadow-sm ${compatibility.valid ? "border-gray-200" : "border-amber-300"}`}>
              <div className="flex items-start gap-2">
                {!compatibility.valid && <AlertCircle className="mt-0.5 h-4 w-4 text-amber-700" />}
                <div><p className="text-sm font-semibold text-gray-900">{compatibility.valid ? "Template ready" : "Template needs review"}</p><p className="mt-1 text-xs text-gray-600">{compatibility.placeholders.length} editable field(s) found.</p></div>
              </div>
              {compatibility.issues.length > 0 && <ul className="mt-3 space-y-1.5 text-xs text-gray-700">{compatibility.issues.map((issue, index) => <li key={`${issue.code}-${issue.placeholder}-${index}`}>• {issue.message}</li>)}</ul>}
            </section>
          )}
        </aside>

        <main className="min-w-0 space-y-5">
          {error && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
          {showTemplateManager && canManageTemplates && (
            <section id="template-management-panel" className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5"><h2 className="text-lg font-bold text-gray-950">Manage approved templates</h2><p className="mt-1 text-sm text-gray-500">Upload a new version of an existing document type, check it, preview it, then make it available to users.</p></div>
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1"><button type="button" onClick={() => { setTemplateMode("version"); setTemplateFileName(""); setTemplateConversionWarnings([]); setTemplateDraft((current) => ({ ...current, template_code: "", content_html: "", field_schema: [], is_new_type: false })); setTemplateValidation(null); setManagerPreviewHtml(""); }} className={`h-9 rounded-md text-xs font-semibold ${templateMode === "version" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}>New version</button><button type="button" onClick={() => { setTemplateMode("new"); setTemplateFileName(""); setTemplateConversionWarnings([]); setTemplateDraft((current) => ({ ...current, template_code: "", content_html: "", field_schema: [], is_new_type: true })); setTemplateValidation(null); setManagerPreviewHtml(""); }} className={`h-9 rounded-md text-xs font-semibold ${templateMode === "new" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}>New document type</button></div>
              <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs leading-5 text-gray-600">{templateMode === "new" ? "Upload a Word, PDF, or HTML template. Add markers such as [DATE] or [APPROVED_BY] in the source document so the system can create editable fields." : "Upload a replacement Word, PDF, or HTML version of an existing approved document type."}</div>
              {templateAdminMessage && <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">{templateAdminMessage}</div>}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-semibold text-gray-700">Template name<input value={templateDraft.name} onChange={(event) => setTemplateDraft({ ...templateDraft, name: event.target.value })} className="mt-1.5 h-9 w-full rounded-lg border border-gray-300 px-3 text-sm font-normal" /></label>
                {templateMode === "new" ? <label className="text-xs font-semibold text-gray-700">Document code<input value={templateDraft.template_code} onChange={(event) => { setTemplateDraft({ ...templateDraft, template_code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") }); setTemplateValidation(null); }} placeholder="EXAMPLE_FORM" className="mt-1.5 h-9 w-full rounded-lg border border-gray-300 px-3 text-sm font-normal" /><span className="mt-1 block font-normal text-gray-500">A permanent identifier using letters and underscores.</span></label> : <label className="text-xs font-semibold text-gray-700">Document type<select value={templateDraft.template_code} onChange={(event) => { setTemplateDraft({ ...templateDraft, template_code: event.target.value }); setTemplateValidation(null); }} className="mt-1.5 h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal"><option value="">Select document type</option>{availableTemplateCodes.map((code) => <option key={code}>{code}</option>)}</select></label>}
                <label className="text-xs font-semibold text-gray-700">Version<input value={templateDraft.version} onChange={(event) => setTemplateDraft({ ...templateDraft, version: event.target.value })} className="mt-1.5 h-9 w-full rounded-lg border border-gray-300 px-3 text-sm font-normal" /></label>
                <label className="text-xs font-semibold text-gray-700">Revision<input value={templateDraft.revision} onChange={(event) => setTemplateDraft({ ...templateDraft, revision: event.target.value })} className="mt-1.5 h-9 w-full rounded-lg border border-gray-300 px-3 text-sm font-normal" /></label>
                <label className="text-xs font-semibold text-gray-700">Orientation<select value={templateDraft.orientation} onChange={(event) => setTemplateDraft({ ...templateDraft, orientation: event.target.value })} className="mt-1.5 h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
                <div className="text-xs font-semibold text-gray-700"><span className="block">Template file</span><label className="mt-1.5 flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 hover:bg-gray-50"><input type="file" accept=".docx,.pdf,.html,.htm,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/html" disabled={templateAdminBusy} onChange={(event) => void loadManagedTemplateFile(event.target.files?.[0])} className="sr-only" /><span className="shrink-0 rounded-md bg-[#DD7230] px-2.5 py-1 text-[11px] font-semibold text-white">{templateAdminBusy ? "Importing…" : templateFileName ? "Replace file" : "Choose template"}</span><span className="min-w-0 truncate font-normal text-gray-500">{templateFileName || "Word, PDF, or HTML"}</span></label><span className="mt-1 block font-normal text-gray-500">Word (.docx) is recommended. PDF and HTML are also supported.</span></div>
              </div>
              {templateConversionWarnings.length > 0 && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5"><p className="text-xs font-semibold text-amber-900">Review the imported template</p><ul className="mt-1 space-y-1 text-xs leading-5 text-amber-800">{templateConversionWarnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></div>}
              {templateMode === "new" && templateDraft.content_html && <div className="mt-5 border-t border-gray-200 pt-5"><div className="mb-3"><h3 className="text-sm font-semibold text-gray-900">Detected fields</h3><p className="mt-1 text-xs text-gray-500">Confirm the label, input type, and whether each field is required.</p></div>{templateDraft.field_schema.length ? <div className="space-y-2">{templateDraft.field_schema.map((field, index) => <div key={field.key} className="grid gap-2 rounded-lg border border-gray-200 p-3 sm:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_130px_auto] sm:items-end"><label className="text-xs font-semibold text-gray-600">Placeholder<input value={field.key} disabled className="mt-1 h-9 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm font-normal text-gray-600" /></label><label className="text-xs font-semibold text-gray-600">Field label<input value={field.label} onChange={(event) => updateDynamicField(index, { label: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-gray-300 px-3 text-sm font-normal" /></label><label className="text-xs font-semibold text-gray-600">Input type<select value={field.type} onChange={(event) => updateDynamicField(index, { type: event.target.value as TemplateFieldDefinition["type"] })} className="mt-1 h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-sm font-normal"><option value="text">Short text</option><option value="multiline">Long text</option><option value="date">Date</option><option value="time">Time</option><option value="person">Person</option><option value="checkbox">Checkbox</option></select></label><label className="flex h-9 items-center gap-2 text-xs font-medium text-gray-700"><input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateDynamicField(index, { required: event.target.checked })} className="accent-gray-900" />Required</label></div>)}</div> : <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">No placeholders were detected. Add fields such as [DOCUMENT_TITLE] or [DATE] to the HTML file and upload it again.</p>}</div>}
              <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={validateManagedTemplate} disabled={templateAdminBusy} className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Check and preview</button><button type="button" onClick={saveTemplateVersion} disabled={templateAdminBusy || !templateValidation?.valid} className="h-9 rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white disabled:opacity-40">Save as draft</button></div>
              <div className="mt-6 border-t border-gray-200 pt-5"><h3 className="mb-3 text-sm font-semibold text-gray-900">Template versions</h3><div className="space-y-2">{managedTemplates.map((template) => <div key={template.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-800">{template.name}</p><p className="text-xs text-gray-500">{template.template_code} · v{template.version} · {template.status}</p></div><div className="flex gap-2"><button type="button" onClick={() => previewManagedVersion(template)} className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">Preview</button>{template.status !== "Active" && <button type="button" onClick={() => changeManagedTemplateStatus(template, "activate")} disabled={templateAdminBusy || previewedTemplateId !== template.id} className="h-8 rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white disabled:opacity-40">Activate</button>}{template.status !== "Active" && <button type="button" onClick={() => changeManagedTemplateStatus(template, "archive")} disabled={templateAdminBusy} className="h-8 rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">Archive</button>}</div></div>)}</div></div>
              {managerPreviewHtml && <div className="mt-5"><TemplatePreview html={sanitizeTemplateHtml(managerPreviewHtml)} title="Template version preview" orientation={templateDraft.orientation as "portrait" | "landscape"} /></div>}
            </section>
          )}
          {templateLoading || carReportLoading || carMasterLogLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">Loading and validating the template…</div>
          ) : schema && sourceHtml ? (
            <>
              <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="text-lg font-bold text-gray-950">Document information</h2><p className="mt-0.5 text-sm text-gray-500">Only permitted values are editable. The approved structure remains locked.</p></div><div className="grid w-full grid-cols-3 gap-2 lg:w-auto"><button type="button" onClick={saveDraft} disabled={documentSaving || documentLocked} className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><Save className="h-3.5 w-3.5 shrink-0" /><span className="whitespace-nowrap">Save draft</span></button>{activeDocument?.status === "FINALIZED" ? <button type="button" onClick={reopenDocument} disabled={documentSaving} className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5 shrink-0" /><span className="whitespace-nowrap">Reopen</span></button> : <button type="button" onClick={finalizeDocument} disabled={documentSaving || documentLocked} className="inline-flex h-9 min-w-0 items-center justify-center rounded-lg bg-gray-900 px-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"><span className="whitespace-nowrap">Finalize</span></button>}<button type="button" onClick={printDocument} className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"><Printer className="h-3.5 w-3.5 shrink-0" /><span className="whitespace-nowrap">Print / PDF</span></button></div></div>
                <label className="mb-5 block"><span className="mb-1.5 block text-sm font-semibold text-gray-800">Document title</span><input value={documentTitle} disabled={documentLocked} onChange={(event) => setDocumentTitle(event.target.value)} placeholder={`${schema.metadata.name} Draft`} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm disabled:bg-gray-100" /></label>
                {activeDocument && <div className="mb-4 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-md border border-gray-300 bg-gray-50 px-2 py-1 font-semibold text-gray-700">{activeDocument.status}</span><span className="text-gray-500">Record {activeDocument.id}</span></div>}
                {documentMessage && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{documentMessage}</div>}
                {schema.metadata.code === "CAR_FORM_1" && (
                  <div className="mb-5 border-l-2 border-gray-400 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    Locked fields come from the official CAR workflow. Changes to Immediate Action, Root Cause, or Corrective Measures affect this generated copy only and do not update the canonical CAR record.
                  </div>
                )}
                {missingRequiredFields.length > 0 && (
                  <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    Complete {missingRequiredFields.map((field) => field.label).join(", ")} before final generation.
                  </div>
                )}
                {schema.metadata.code === "MEMORANDUM" && (
                  <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-gray-600" /><p className="text-sm font-semibold text-gray-900">Optional AI body draft</p></div>
                    <p className="mt-1 text-xs text-gray-500">AI only drafts the memorandum body. Review and edit it before printing.</p>
                    <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={3} placeholder="Describe the purpose, audience, important details, and requested action." className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm" />
                    <div className="mt-2 flex flex-wrap items-center gap-3"><button type="button" onClick={draftMemoBody} disabled={aiDrafting} className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{aiDrafting ? "Drafting…" : "Draft body"}</button>{aiDrafted && <span className="text-xs font-medium text-amber-700">AI-generated draft — human review required</span>}</div>
                  </div>
                )}
                <div className="grid gap-5 lg:grid-cols-2">
                  {schema.fields.map((field) => {
                    const value = values[field.key];
                    if (field.type === "repeatable-text") {
                      const entries = Array.isArray(value) ? value as string[] : [];
                      return <div key={field.key} className="space-y-2 lg:col-span-2"><div className="flex items-center justify-between"><label className="text-sm font-semibold text-gray-800">{field.label}{field.required && " *"}</label>{!documentLocked && <button type="button" onClick={() => addRow(field)} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-950"><Plus className="h-3.5 w-3.5" /> Add</button>}</div>{entries.map((entry, index) => <div key={index} className="flex gap-2"><input value={entry} disabled={documentLocked} onChange={(event) => setTextEntry(field.key, index, event.target.value)} className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100" />{!documentLocked && <button type="button" aria-label={`Remove ${field.label} row ${index + 1}`} onClick={() => removeRow(field, index)} className="rounded-lg p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}</div>)}</div>;
                    }
                    if (field.type === "repeatable-table") {
                      const entries = Array.isArray(value) ? value as TemplateTableRowValue[] : [];
                      return <div key={field.key} className="space-y-3 lg:col-span-2"><div className="flex items-center justify-between"><label className="text-sm font-semibold text-gray-800">{field.label}{field.required && " *"}{field.controlled && <LockKeyhole className="ml-1 inline h-3.5 w-3.5 text-gray-400" />}</label>{!field.controlled && !documentLocked && <button type="button" onClick={() => addRow(field)} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-950"><Plus className="h-3.5 w-3.5" /> Add row</button>}</div>{entries.map((row, index) => <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-3"><div className="mb-2 flex justify-between"><span className="text-xs font-semibold text-gray-500">Row {index + 1}</span>{!field.controlled && !documentLocked && <button type="button" aria-label={`Remove row ${index + 1}`} onClick={() => removeRow(field, index)} className="text-gray-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}</div><div className="grid gap-3 md:grid-cols-2">{(field.columns || []).map((column) => <label key={column.key} className="text-xs font-medium text-gray-600">{column.label}<input value={row[column.key] || ""} disabled={field.controlled || documentLocked} onChange={(event) => setTableCell(field.key, index, column.key, event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100" /></label>)}</div></div>)}</div>;
                    }
                    if (field.type === "checkbox") return <label key={field.key} className="flex items-center gap-2 border-b border-gray-100 py-2 text-sm text-gray-700"><input type="checkbox" checked={value === true} disabled={field.controlled || documentLocked} onChange={(event) => setScalar(field.key, event.target.checked)} className="accent-gray-800" /><span>{field.label}</span>{field.controlled && <LockKeyhole className="ml-auto h-3.5 w-3.5 text-gray-400" />}</label>;
                    const multiline = field.type === "multiline";
                    return <label key={field.key} className={multiline ? "lg:col-span-2" : ""}><span className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-gray-800">{field.label}{field.required && " *"}{field.controlled && <LockKeyhole className="h-3.5 w-3.5 text-gray-400" />}</span>{multiline ? <textarea rows={5} value={typeof value === "string" ? value : ""} disabled={field.controlled || documentLocked} onChange={(event) => setScalar(field.key, event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm disabled:bg-gray-100" /> : <input type={field.type === "date" || field.type === "time" ? field.type : "text"} value={typeof value === "string" ? value : ""} disabled={field.controlled || documentLocked} onChange={(event) => setScalar(field.key, event.target.value)} className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm disabled:bg-gray-100" />}{field.helpText && <span className="mt-1 block text-xs font-normal text-gray-500">{field.helpText}</span>}</label>;
                  })}
                </div>
              </section>
              <TemplatePreview ref={previewRef} html={renderedHtml} title={schema.metadata.name} orientation={schema.metadata.orientation} />
            </>
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center"><FileText className="mb-3 h-9 w-9 text-gray-300" /><h2 className="font-semibold text-gray-800">Select an approved template</h2><p className="mt-1 max-w-md text-sm text-gray-500">The composer will validate its declared schema and open a safe, isolated preview.</p></div>
          )}
        </main>
      </div>
    </div>
  );
}
