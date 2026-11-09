import { hasCapability, hasPermission } from "../utils/rolePermissions";
import { useState, useRef, useEffect } from "react"
import { Search, Filter, Upload, Download, Edit, Archive, Clock, Eye, CheckCircle, FileText, UploadCloud, X, Loader2, AlertCircle, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react"
import axios from "axios"
import { useRole } from "../contexts/RoleContext"
import { ISO_OFFICES_16 } from "./UsersRoles"
import { CAMPUS_OFFICES, CAMPUS_PROGRAMS } from "../constants/academicScopes"
import { useUploadQueue } from "../contexts/UploadQueueContext"
import { apiClient } from "../api/client";

export interface BackgroundUploadTask {
  id: string
  docName: string
  category: string
  office: string
  version: string
  fileName: string
  progress: number
  status: 'uploading' | 'vectorizing' | 'completed' | 'error' | 'cancelled'
  statusText: string
  abortController: AbortController
  isVersionUpdate?: boolean
}

type RepositoryScopeType = "CAMPUS" | "OFFICE" | "PROGRAM"

type DuplicateCode = "NEW_DOCUMENT" | "EXACT_DUPLICATE" | "CROSS_SCOPE_DUPLICATE" | "POSSIBLE_NEW_VERSION"

interface DuplicateCheckResult {
  code: DuplicateCode
  message: string
  existing_document?: {
    document_name?: string
    original_filename?: string
    office?: string
    program?: string
    scope_type?: RepositoryScopeType
    scope_code?: string
    version?: string
    status?: string
  } | null
}

interface PendingDuplicateDecision {
  result: DuplicateCheckResult
  mode: "NEW_DOCUMENT" | "NEW_VERSION"
  file: File
}

async function sha256File(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")
}

export function KnowledgeRepository() {
  const { userRole } = useRole()
  const currentRole = userRole || "STUDENT"

  const canUpload = hasPermission(currentRole, "canUploadDocuments")
  const canEdit = hasPermission(currentRole, "canEditDocuments")
  const assignments: any[] = (() => { try { return JSON.parse(sessionStorage.getItem("userAssignments") || "[]") } catch { return [] } })()
  const assignedOffices = assignments.filter((item) => item.scope_type === "OFFICE").map((item) => item.scope_name).filter(Boolean)
  const allowedPrograms: string[] = (() => { try { return JSON.parse(sessionStorage.getItem("allowedPrograms") || "[]") } catch { return [] } })()
  const documentOffices = currentRole === "SYSTEM_ADMIN"
    ? [...CAMPUS_OFFICES]
    : assignedOffices
  const defaultOffice = documentOffices[0] || ""
  const selectablePrograms = currentRole === "SYSTEM_ADMIN" ? CAMPUS_PROGRAMS : CAMPUS_PROGRAMS.filter((program) => allowedPrograms.includes(program.code))
  const defaultProgram = selectablePrograms[0]?.code || ""
  const availableScopeTypes: RepositoryScopeType[] = currentRole === "SYSTEM_ADMIN"
    ? ["CAMPUS", "OFFICE", "PROGRAM"]
    : [
        ...(documentOffices.length ? ["OFFICE" as const] : []),
        ...(selectablePrograms.length ? ["PROGRAM" as const] : []),
      ]
  const defaultScopeType: RepositoryScopeType = availableScopeTypes[0] || "CAMPUS"
  const defaultScopeCode = defaultScopeType === "OFFICE" ? defaultOffice : defaultScopeType === "PROGRAM" ? defaultProgram : "ARGAO"

  const [documents, setDocuments] = useState<any[]>([])
  const [processingStatuses, setProcessingStatuses] = useState<any[]>([])
  
  // Upload queue is now global (survives navigation) — managed by UploadQueueContext
  const { enqueueUpload } = useUploadQueue()
  
  // --- TOAST NOTIFICATION STATE ---
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Modals State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingDocName, setEditingDocName] = useState("")
  const [editingDocScope, setEditingDocScope] = useState<{ type: RepositoryScopeType; code: string }>({ type: "CAMPUS", code: "ARGAO" })
  const [isEditing, setIsEditing] = useState(false)

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [docToDelete, setDocToDelete] = useState<any>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isArchiving, setIsArchiving] = useState(false)
  
  const [showArchived, setShowArchived] = useState(false)

  // Update Version Modal State
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [docToUpdate, setDocToUpdate] = useState<any>(null)
  const [updateFormData, setUpdateFormData] = useState({ version: "", effectivityDate: "" })
  const [updateFile, setUpdateFile] = useState<File | null>(null)
  const [isUpdatingVersion, setIsUpdatingVersion] = useState(false)
  const updateFileInputRef = useRef<HTMLInputElement>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedOffice, setSelectedOffice] = useState("all")
  const [selectedProgram, setSelectedProgram] = useState(allowedPrograms.length === 1 ? allowedPrograms[0] : "all")

  const [formData, setFormData] = useState({
    name: "",
    category: "Policy",
    office: defaultScopeType === "OFFICE" ? defaultOffice : defaultScopeType === "PROGRAM" ? CAMPUS_PROGRAMS.find(item => item.code === defaultProgram)?.college || "Academic Program" : "Campus-wide",
    program: defaultScopeType === "PROGRAM" ? defaultProgram : "GLOBAL",
    scopeType: defaultScopeType,
    scopeCode: defaultScopeCode,
    version: "",
    effectivityDate: ""
  })

  const scopeValues = (data: typeof formData) => {
    if (data.scopeType === "OFFICE") return { office: data.scopeCode, program: "GLOBAL" }
    if (data.scopeType === "PROGRAM") {
      const program = CAMPUS_PROGRAMS.find(item => item.code === data.scopeCode)
      return { office: program?.college || "Academic Program", program: data.scopeCode }
    }
    return { office: "Campus-wide", program: "GLOBAL" }
  }

  const resetForm = () => setFormData({
    name: "", category: "Policy",
    office: defaultScopeType === "OFFICE" ? defaultOffice : defaultScopeType === "PROGRAM" ? CAMPUS_PROGRAMS.find(item => item.code === defaultProgram)?.college || "Academic Program" : "Campus-wide",
    program: defaultScopeType === "PROGRAM" ? defaultProgram : "GLOBAL",
    scopeType: defaultScopeType, scopeCode: defaultScopeCode,
    version: "", effectivityDate: "",
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [duplicateDecision, setDuplicateDecision] = useState<PendingDuplicateDecision | null>(null)

  const loadDocs = async () => {
    try {
      const res = await apiClient.get(`/documents?t=${Date.now()}`);
      setDocuments(res.data);
      if (canEdit) {
        const statusRes = await apiClient.get(`/documents/processing-status?t=${Date.now()}`);
        setProcessingStatuses(statusRes.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents", error);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [currentRole]);

  const getAccessBadge = () => {
    if (canUpload && canEdit) {
      // Changed to the updated amber scheme tint
      return { label: "Full Access", color: "bg-orange-50 text-[#DD7230] border-[#DD7230]/20", icon: CheckCircle }
    } else {
      // Changed to a neutral amber tint
      return { label: "View Only", color: "bg-[#FFF4E5] text-[#DD7230] border-[#DD7230]/10", icon: Eye }
    }
  }

  const accessBadge = getAccessBadge()

  const filteredDocuments = documents.filter((doc) => {
    // Students must not see template or branding assets in any category spelling.
    const normalizedCategory = String(doc.category || "").trim().toLowerCase();
    if (currentRole === "STUDENT" && [
      "form / template",
      "forms / templates",
      "branding asset",
      "branding assets",
    ].includes(normalizedCategory)) {
      return false;
    }

    // Accreditation evidence is also restricted for students.
    if (currentRole === "STUDENT" && normalizedCategory === "accreditation evidence") {
      return false;
    }

    // 2. FACULTY: Program-Restricted filtering for Accreditation Evidence
    if (currentRole === "PERSONNEL" && doc.category === "Accreditation Evidence") {
      if (doc.program && doc.program !== "GLOBAL" && !allowedPrograms.includes(doc.program)) {
        return false; // Faculty cannot view evidence from other departments
      }
    }

    // 3. Status filter
    if (doc.status === "Archived" && !showArchived) {
      return false;
    }

    // 4. Program Filter Dropdown
    const matchesProgram = 
      selectedProgram === "all" || 
      !doc.program || 
      doc.program === "GLOBAL" || 
      doc.program === selectedProgram;

    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    const matchesOffice = selectedOffice === "all" || 
      doc.office === selectedOffice ||
      (selectedOffice === "Student Affairs & Services" && (doc.office === "Student Affairs" || doc.office === "SAS")) ||
      (selectedOffice === "Quality Assurance & Management (QAU)" && (doc.office === "Quality Assurance" || doc.office === "QAU")) ||
      (selectedOffice === "Research & Development" && (doc.office === "Research Office" || doc.office === "R&D")) ||
      (selectedOffice === "HR & Records Management" && (doc.office === "HRMO" || doc.office === "HR"));
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchLower) ||
      doc.category.toLowerCase().includes(searchLower) ||
      doc.office.toLowerCase().includes(searchLower) ||
      (doc.program && doc.program.toLowerCase().includes(searchLower)) ||
      (doc.effectivity_date && doc.effectivity_date.toLowerCase().includes(searchLower));
    
    return matchesCategory && matchesOffice && matchesProgram && matchesSearch;
  });

  const handleView = async (doc: any) => {
    if (doc.file_url || doc.name) {
      const userEmail = sessionStorage.getItem('userEmail') || 'Unknown';
      const userRole = sessionStorage.getItem('userRole') || 'STUDENT';

      apiClient.post("/audit/access", {
        document_name: doc.name,
        action_type: "View",
        user_email: userEmail,
        user_role: userRole
      }).catch(err => console.error("Silently failed to log access"));

      // Open a blank tab synchronously so browsers do not block the later
      // navigation while the backend creates a fresh signed URL.
      const previewWindow = window.open("about:blank", "_blank");
      try {
        const response = await apiClient.get("/documents/file-url", {
          params: {
            document_name: doc.name,
            version: doc.version,
            scope_type: doc.scope_type,
            scope_code: doc.scope_code,
          },
        });
        if (previewWindow) {
          previewWindow.location.href = response.data.file_url;
        } else {
          window.open(response.data.file_url, "_blank");
        }
      } catch (error) {
        previewWindow?.close();
        console.error("Document view failed:", error);
        showToast("The document could not be opened. Please try again.", "error");
      }
    } else {
      showToast("Document link not found!", "error");
    }
  };

  const handleDownload = async (doc: any) => {
    if (!doc.file_url) {
      showToast("Document link not found!", "error");
      return;
    }
    try {
      const userEmail = sessionStorage.getItem('userEmail') || 'Unknown';
      const userRole = sessionStorage.getItem('userRole') || 'STUDENT';

      apiClient.post("/audit/access", {
        document_name: doc.name,
        action_type: "Download",
        user_email: userEmail,
        user_role: userRole
      }).catch(err => console.error("Silently failed to log access"));

      const response = await fetch(doc.file_url);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const safeName = doc.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `${safeName}_v${doc.version || '1.0'}.pdf`; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(doc.file_url, "_blank"); 
    }
  };

  const handleEditClick = (doc: any) => {
    const inferredScopeType: RepositoryScopeType = doc.scope_type || (doc.program && doc.program !== "GLOBAL" ? "PROGRAM" : "CAMPUS")
    const inferredScopeCode = doc.scope_code || (inferredScopeType === "PROGRAM" ? doc.program : inferredScopeType === "OFFICE" ? doc.office : "ARGAO")
    setFormData({
      name: doc.name,
      category: doc.category,
      office: doc.office,
      program: doc.program || "GLOBAL",
      scopeType: inferredScopeType,
      scopeCode: inferredScopeCode,
      version: doc.version,
      effectivityDate: doc.effectivity_date !== "N/A" ? doc.effectivity_date : ""
    })
    setEditingDocName(doc.name)
    setEditingDocScope({ type: inferredScopeType, code: inferredScopeCode })
    setShowEditModal(true)
  }

  const handleEditSubmit = async () => {
    if (!formData.name || !formData.version || !formData.effectivityDate) {
      showToast("Please fill out all fields.", "error")
      return
    }
    setIsEditing(true)
    try {
      await apiClient.put("/documents/update", {
        old_name: editingDocName,
        old_scope_type: editingDocScope.type,
        old_scope_code: editingDocScope.code,
        new_name: formData.name,
        category: formData.category,
        ...scopeValues(formData),
        scope_type: formData.scopeType,
        scope_code: formData.scopeCode,
        version: formData.version,
        effectivity_date: formData.effectivityDate
      })
      setShowEditModal(false)
      resetForm()
      const res = await apiClient.get("/documents")
      setDocuments(res.data)
      showToast("Metadata successfully updated!", "success")
    } catch (error) {
      showToast("Failed to update document.", "error")
    } finally {
      setIsEditing(false)
    }
  }

  const handleArchiveClick = (doc: any) => {
    setDocToDelete(doc)
    setDeleteConfirmText("")
    setShowDeleteModal(true)
  }

  const executeArchive = async () => {
    if (!docToDelete) return
    setIsArchiving(true)
    try {
      await apiClient.delete(`/documents/${encodeURIComponent(docToDelete.name)}`, {
        params: { scope_type: docToDelete.scope_type, scope_code: docToDelete.scope_code },
      })
      setShowDeleteModal(false)
      setDocToDelete(null)
      setDeleteConfirmText("")
      const res = await apiClient.get("/documents")
      setDocuments(res.data)
      showToast("Document successfully archived!", "success")
    } catch (error) {
      showToast("Failed to archive document.", "error")
    } finally {
      setIsArchiving(false)
    }
  }

  const approveDocument = async (doc: any) => {
    try {
      await apiClient.post(`/documents/${encodeURIComponent(doc.name)}/approve`, null, {
        params: { scope_type: doc.scope_type, scope_code: doc.scope_code },
      })
      await loadDocs()
      showToast(`"${doc.name}" is now approved and searchable.`, "success")
    } catch (error) {
      showToast("Failed to approve document.", "error")
    }
  }

  const handleUpdateVersionClick = (doc: any) => {
    setDocToUpdate(doc)
    setUpdateFormData({ version: "", effectivityDate: "" })
    setUpdateFile(null)
    setShowUpdateModal(true)
  }

  // --- BACKGROUND UPLOAD QUEUE HANDLERS ---
  // These now delegate to the global UploadQueueContext so the panel
  // survives navigation away from this page.

  const checkDuplicate = async (
    file: File,
    document: { name: string; category: string; office: string; program?: string; scopeType?: RepositoryScopeType; scopeCode?: string },
    mode: "NEW_DOCUMENT" | "NEW_VERSION",
  ): Promise<DuplicateCheckResult> => {
    let response
    if (globalThis.crypto?.subtle) {
      const fileSha256 = await sha256File(file)
      response = await apiClient.post("/documents/check-duplicate", {
        file_sha256: fileSha256,
        file_size: file.size,
        original_filename: file.name,
        document_name: document.name,
        category: document.category,
        office: document.office,
        program: document.program || "GLOBAL",
        scope_type: document.scopeType || "CAMPUS",
        scope_code: document.scopeCode || "ARGAO",
        upload_mode: mode,
      })
    } else {
      // Web Crypto requires HTTPS outside localhost. Campus LAN deployments
      // may initially use HTTP, so keep duplicate checks functional there.
      const fallbackData = new FormData()
      fallbackData.append("file", file)
      fallbackData.append("document_name", document.name)
      fallbackData.append("category", document.category)
      fallbackData.append("office", document.office)
      fallbackData.append("program", document.program || "GLOBAL")
      fallbackData.append("scope_type", document.scopeType || "CAMPUS")
      fallbackData.append("scope_code", document.scopeCode || "ARGAO")
      fallbackData.append("upload_mode", mode)
      response = await apiClient.post("/documents/check-duplicate-file", fallbackData)
    }
    return response.data
  }

  const queueVersionUpload = (file: File, allowCrossScopeDuplicate = false) => {
    if (!docToUpdate) return
    const currentDocument = docToUpdate
    const submitData = new FormData()
    submitData.append("file", file)
    submitData.append("old_document_name", currentDocument.name)
    submitData.append("new_version", updateFormData.version)
    submitData.append("new_effectivity_date", updateFormData.effectivityDate)
    submitData.append("office", currentDocument.office || "")
    submitData.append("program", currentDocument.program || "GLOBAL")
    submitData.append("allow_cross_scope_duplicate", String(allowCrossScopeDuplicate))

    enqueueUpload({
      docName: currentDocument.name,
      category: currentDocument.category || "Document",
      office: currentDocument.office || "",
      version: updateFormData.version,
      fileName: file.name,
      endpoint: "/api/upload-new-version",
      formData: submitData,
      isVersionUpdate: true,
      onComplete: (name) => {
        loadDocs()
        showToast(`New version of "${name}" successfully published!`, "success")
      },
    })

    setShowUpdateModal(false)
    setUpdateFile(null)
    setDocToUpdate(null)
    showToast(`Version update for "${currentDocument.name}" started in background!`, "success")
  }

  const handleUpdateVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!updateFile || !updateFormData.version || !updateFormData.effectivityDate || !docToUpdate) {
      showToast("Please provide the new file, version, and effectivity date.", "error")
      return
    }

    setIsUpdatingVersion(true)
    try {
      const result = await checkDuplicate(
        updateFile,
        {
          name: docToUpdate.name,
          category: docToUpdate.category || "Document",
          office: docToUpdate.office || "",
          program: docToUpdate.program || "GLOBAL",
          scopeType: docToUpdate.scope_type || (docToUpdate.program && docToUpdate.program !== "GLOBAL" ? "PROGRAM" : "CAMPUS"),
          scopeCode: docToUpdate.scope_code || (docToUpdate.program && docToUpdate.program !== "GLOBAL" ? docToUpdate.program : "ARGAO"),
        },
        "NEW_VERSION",
      )
      if (result.code === "NEW_DOCUMENT") {
        queueVersionUpload(updateFile)
      } else {
        setDuplicateDecision({ result, mode: "NEW_VERSION", file: updateFile })
      }
    } catch (error: any) {
      showToast(error?.response?.data?.detail?.message || "Could not verify this file. Please try again.", "error")
    } finally {
      setIsUpdatingVersion(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }
  
  const handleDrop = (e: React.DragEvent, isUpdateModal = false) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (isUpdateModal) setUpdateFile(e.dataTransfer.files[0]);
      else setSelectedFile(e.dataTransfer.files[0]);
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isUpdateModal = false) => {
    if (e.target.files && e.target.files.length > 0) {
      if (isUpdateModal) setUpdateFile(e.target.files[0]);
      else setSelectedFile(e.target.files[0]);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === "scopeType") {
      const scopeType = value as RepositoryScopeType
      const scopeCode = scopeType === "OFFICE" ? defaultOffice : scopeType === "PROGRAM" ? defaultProgram : "ARGAO"
      const next = { ...formData, scopeType, scopeCode }
      setFormData({ ...next, ...scopeValues(next) })
      return
    }
    if (name === "scopeCode") {
      const next = { ...formData, scopeCode: value }
      setFormData({ ...next, ...scopeValues(next) })
      return
    }
    setFormData({ ...formData, [name]: value })
  }

  const queueNewDocumentUpload = (file: File, allowCrossScopeDuplicate = false) => {
    const uploadSnapshot = { ...formData }
    const resolvedScope = scopeValues(uploadSnapshot)
    const submitData = new FormData()
    submitData.append("file", file)
    submitData.append("name", uploadSnapshot.name)
    submitData.append("category", uploadSnapshot.category)
    submitData.append("office", resolvedScope.office)
    submitData.append("program", resolvedScope.program)
    submitData.append("scope_type", uploadSnapshot.scopeType)
    submitData.append("scope_code", uploadSnapshot.scopeCode)
    submitData.append("version", uploadSnapshot.version)
    submitData.append("effectivity_date", uploadSnapshot.effectivityDate)
    submitData.append("allow_cross_scope_duplicate", String(allowCrossScopeDuplicate))

    enqueueUpload({
      docName: uploadSnapshot.name,
      category: uploadSnapshot.category,
      office: resolvedScope.office,
      version: uploadSnapshot.version,
      fileName: file.name,
      endpoint: "/api/upload-document",
      formData: submitData,
      isVersionUpdate: false,
      onComplete: (name) => {
        const newDoc = {
          id: "temp_" + Date.now(),
          name,
          category: uploadSnapshot.category,
          office: resolvedScope.office,
          program: resolvedScope.program,
          scope_type: uploadSnapshot.scopeType,
          scope_code: uploadSnapshot.scopeCode,
          version: uploadSnapshot.version,
          effectivity_date: uploadSnapshot.effectivityDate,
          status: "Active",
          uploaded_by: sessionStorage.getItem("userEmail") || "Unknown",
          created_at: new Date().toISOString(),
        }
        setDocuments(prev => [newDoc, ...prev])
        loadDocs()
        showToast(`"${name}" successfully added to repository!`, "success")
      },
    })

    setShowUploadModal(false)
    setSelectedFile(null)
    resetForm()
    showToast(`Upload of "${uploadSnapshot.name}" started in background!`, "success")
  }

  const handleUploadSubmit = async () => {
    if (!selectedFile || !formData.name || !formData.version || !formData.effectivityDate || !formData.scopeCode) {
      showToast("Please fill out all fields and select a file.", "error")
      return
    }

    setIsUploading(true)
    try {
      const result = await checkDuplicate(selectedFile, { ...formData, ...scopeValues(formData) }, "NEW_DOCUMENT")
      if (result.code === "NEW_DOCUMENT") {
        queueNewDocumentUpload(selectedFile)
      } else {
        setDuplicateDecision({ result, mode: "NEW_DOCUMENT", file: selectedFile })
      }
    } catch (error: any) {
      showToast(error?.response?.data?.detail?.message || "Could not verify this file. Please try again.", "error")
    } finally {
      setIsUploading(false)
    }
  }

  const continueCrossScopeUpload = () => {
    if (!duplicateDecision) return
    if (duplicateDecision.mode === "NEW_VERSION") {
      queueVersionUpload(duplicateDecision.file, true)
    } else {
      queueNewDocumentUpload(duplicateDecision.file, true)
    }
    setDuplicateDecision(null)
  }

  const continueAsNewVersion = () => {
    if (!duplicateDecision) return
    const existing = duplicateDecision.result.existing_document
    const matchingDocument = documents.find(doc =>
      doc.name === existing?.document_name &&
      doc.office === existing?.office &&
      (doc.program || "GLOBAL") === (existing?.program || "GLOBAL")
    )
    const target = matchingDocument || {
      name: existing?.document_name || formData.name,
      category: formData.category,
      office: existing?.office || formData.office,
      program: existing?.program || formData.program,
      scope_type: existing?.scope_type || formData.scopeType,
      scope_code: existing?.scope_code || formData.scopeCode,
      version: existing?.version || "",
    }
    setShowUploadModal(false)
    setSelectedFile(null)
    setDocToUpdate(target)
    setUpdateFile(duplicateDecision.file)
    setUpdateFormData({ version: formData.version, effectivityDate: formData.effectivityDate })
    setShowUpdateModal(true)
    setDuplicateDecision(null)
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)] relative">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium z-[100] transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
          toast.type === 'success' 
            ? 'bg-[#FFF4E5] text-[#DD7230] border border-[#DD7230]/30' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4 text-[#DD7230]" /> : <AlertCircle className="h-4 w-4 text-rose-500" />}
          {toast.message}
        </div>
      )}

      {duplicateDecision && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {duplicateDecision.result.code === "EXACT_DUPLICATE"
                  ? "Document already uploaded"
                  : duplicateDecision.result.code === "POSSIBLE_NEW_VERSION"
                    ? "Existing document found"
                    : "Document exists in another scope"}
              </h2>
              <button
                type="button"
                onClick={() => setDuplicateDecision(null)}
                className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100"
                aria-label="Close duplicate notice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <p className="text-sm leading-6 text-gray-600">{duplicateDecision.result.message}</p>
              {duplicateDecision.result.existing_document && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                  <p className="font-medium text-gray-900">
                    {duplicateDecision.result.existing_document.document_name || "Existing document"}
                  </p>
                  <p className="mt-1">
                    {[duplicateDecision.result.existing_document.office, duplicateDecision.result.existing_document.program !== "GLOBAL" ? duplicateDecision.result.existing_document.program : null]
                      .filter(Boolean)
                      .join(" · ")}
                    {duplicateDecision.result.existing_document.version
                      ? ` · v${duplicateDecision.result.existing_document.version}`
                      : ""}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50/60 px-5 py-4">
              <button
                type="button"
                onClick={() => setDuplicateDecision(null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {duplicateDecision.result.code === "EXACT_DUPLICATE" ? "Close" : "Cancel"}
              </button>
              {duplicateDecision.result.code === "CROSS_SCOPE_DUPLICATE" && (
                <button
                  type="button"
                  onClick={continueCrossScopeUpload}
                  className="rounded-lg bg-[#DD7230] px-4 py-2 text-xs font-semibold text-white hover:bg-[#c9652b]"
                >
                  Upload to this scope
                </button>
              )}
              {duplicateDecision.result.code === "POSSIBLE_NEW_VERSION" && (
                <button
                  type="button"
                  onClick={continueAsNewVersion}
                  className="rounded-lg bg-[#DD7230] px-4 py-2 text-xs font-semibold text-white hover:bg-[#c9652b]"
                >
                  Continue as new version
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-none space-y-4">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Knowledge Repository</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Centralized storage for institutional documents, policies, and evidence.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 text-gray-700 text-xs font-medium">
              <accessBadge.icon className="h-3.5 w-3.5 text-gray-500" />
              <span>{accessBadge.label}</span>
            </div>
            
            {canEdit && (
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  showArchived 
                    ? "bg-gray-900 text-white border-gray-900 hover:bg-black" 
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Archive className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="whitespace-nowrap">
                  {showArchived ? "Hide Archived" : "Show Archived"}
                </span>
              </button>
            )}

            {/* Ingestion badge is shown globally in DashboardLayout — no local state needed */}

            {canUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#DD7230] text-white text-xs font-semibold rounded-lg hover:bg-[#DD7230] transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Document</span>
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by document name, category, office, or date..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <select
                className="sm:w-44 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-700 cursor-pointer transition-colors"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="Policy">Policy</option>
                <option value="Procedure / Guideline">Procedure / Guideline</option>
                <option value="Memorandum">Memorandum</option>
                <option value="Resolution">Resolution</option>
                <option value="Accreditation Evidence">Accreditation Evidence</option>
                {currentRole !== "STUDENT" && <>
                  <option value="Forms / Templates">Forms / Templates</option>
                  <option value="Branding Asset">Branding Asset</option>
                </>}
                <option value="Other">Other</option>
              </select>
              
              <select
                className="sm:w-56 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-700 cursor-pointer transition-colors"
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
              >
                <option value="all">All Offices</option>
                {ISO_OFFICES_16.map((office) => (
                  <option key={office} value={office}>
                    {office}
                  </option>
                ))}
              </select>

              <select
                className="sm:w-44 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-700 cursor-pointer transition-colors"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                disabled={allowedPrograms.length === 1}
              >
                <option value="all">All Programs</option>
                {selectablePrograms.map((program) => <option key={program.code} value={program.code}>{program.code}</option>)}
                {(currentRole === "SYSTEM_ADMIN" || hasCapability("governance.cross_office")) && <option value="GLOBAL">Global Campus</option>}
              </select>
            </div>
          </div>
        </div>
      </div>

      {canEdit && processingStatuses.length > 0 && (
        <div className="space-y-2">
          {processingStatuses.slice(0, 5).map((item) => (
            <div key={item.job_id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-800">{item.name}</p>
                <p className="truncate text-[11px] text-gray-500">{item.message}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${item.status === "failed" ? "border-rose-200 bg-rose-50 text-rose-700" : item.status === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                {item.status === "extracting" ? "Reading" : item.status === "embedding" ? "Processing" : item.status === "completed" ? "Ready" : item.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 h-auto bg-white rounded-xl border border-gray-200 shadow-2xs flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 h-auto overflow-auto">
          <table className="w-full whitespace-nowrap relative table-fixed">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 z-20">
              <tr>
                <th className="w-[28%] px-4 py-3 text-left">Document Name</th>
                <th className="w-[18%] px-4 py-3 text-left">Category & Program</th>
                <th className="w-[16%] px-4 py-3 text-left">Office</th>
                <th className="w-[8%] px-4 py-3 text-left">Version</th>
                <th className="w-[12%] px-4 py-3 text-left">Effectivity</th>
                <th className="w-[8%] px-4 py-3 text-left">Status</th>
                <th className="w-[10%] px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="h-auto divide-y divide-gray-200/70">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-gray-400">
                    No documents found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc, idx) => (
                  <tr key={doc.id || `${doc.name}-${doc.version || '1.0'}-${idx}`} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 overflow-hidden">
                      <div className="text-xs font-semibold text-gray-900 truncate" title={doc.name}>{doc.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                        {doc.status === "Archived" ? "Historical Record" : doc.status === "Superseded" ? "Replaced by newer version" : "Repository File"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 truncate flex flex-col items-start gap-1" title={doc.category}>
                      <span>{doc.category}</span>
                      {doc.program && doc.program !== "GLOBAL" ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase bg-blue-50 text-blue-700 rounded border border-blue-200/60">
                          {doc.program}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase bg-gray-100 text-gray-600 rounded border border-gray-200">
                          Global
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 truncate" title={doc.office}>{doc.office}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${doc.status === "Archived" ? "text-gray-400" : "text-gray-900"}`}>
                        v{doc.version}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {doc.effectivity_date || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 inline-flex text-[10px] font-medium rounded-full border ${
                        doc.status === "Archived" || doc.status === "Superseded"
                          ? "bg-gray-100 text-gray-600 border-gray-200"
                          : doc.status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                            : doc.status === "Needs Revision"
                              ? "bg-rose-50 text-rose-700 border-rose-200/60"
                              : "bg-amber-50 text-amber-700 border-amber-200/60"
                      }`}>
                        {doc.status || "Active"}
                      </span>
                      {doc.status === "Approved" && doc.approved_by && (
                        <div className="mt-1 text-[10px] text-gray-400 truncate" title={doc.approved_at || undefined}>
                          Approved by {doc.approved_by}
                        </div>
                      )}
                      {doc.status === "Needs Revision" && doc.admin_feedback && (
                        <div className="mt-1 text-[10px] text-rose-600 truncate" title={doc.admin_feedback}>
                          {doc.admin_feedback}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleView(doc)} className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-1" title="View Document">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDownload(doc)} className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-1" title="Download">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {canEdit && doc.can_manage && doc.status !== "Archived" && (
                          <>
                            <button onClick={() => handleUpdateVersionClick(doc)} className="text-gray-400 hover:text-[#DD7230] transition-colors cursor-pointer p-1" title="Upload New Version">
                              <UploadCloud className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleEditClick(doc)} className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-1" title="Edit Metadata">
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleArchiveClick(doc)} className="text-gray-400 hover:text-rose-600 transition-colors cursor-pointer p-1" title="Archive Document">
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        {doc.can_manage && doc.status === "Pending Review" && (
                          <button onClick={() => approveDocument(doc)} className="text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer p-1" title="Approve and publish document">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW VERSION MODAL */}
      {showUpdateModal && docToUpdate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl overflow-hidden border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xs font-semibold text-gray-900">Upload New Version</h2>
                <p className="text-[11px] text-gray-500">Supersede the active document</p>
              </div>
              <button onClick={() => setShowUpdateModal(false)} className="p-1 hover:bg-gray-200 rounded-md transition-colors cursor-pointer text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateVersionSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-gray-50/70 rounded-lg border border-gray-200">
                <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">Target Document</label>
                <div className="text-xs font-semibold text-gray-900 truncate">{docToUpdate.name}</div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                  <span>{docToUpdate.category}</span>
                  <span>•</span>
                  <span>{docToUpdate.office}</span>
                  <span>•</span>
                  <span>Current: v{docToUpdate.version}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">New Version Number</label>
                  <input
                    type="text"
                    required
                    value={updateFormData.version}
                    onChange={(e) => setUpdateFormData({...updateFormData, version: e.target.value})}
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                    placeholder={`e.g., ${(parseFloat(docToUpdate.version) + 1.0).toFixed(1)}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">New Effectivity Date</label>
                  <input
                    type="date"
                    required
                    value={updateFormData.effectivityDate}
                    onChange={(e) => setUpdateFormData({...updateFormData, effectivityDate: e.target.value})}
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Upload New File</label>
                <div 
                  onDragOver={(e) => handleDragOver(e)}
                  onDragLeave={(e) => handleDragLeave(e)}
                  onDrop={(e) => handleDrop(e, true)}
                  onClick={() => updateFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-5 text-center transition-all cursor-pointer ${
                    isDragging ? "border-[#DD7230] bg-orange-50/30" : "border-gray-200 hover:border-gray-300 bg-gray-50/40"
                  }`}
                >
                  {updateFile ? (
                    <div className="flex flex-col items-center">
                      <FileText className="h-6 w-6 text-[#DD7230] mb-1.5" />
                      <p className="text-xs font-semibold text-gray-900">{updateFile.name}</p>
                    </div>
                  ) : (
                    <div>
                      <UploadCloud className="h-6 w-6 mx-auto mb-1.5 text-gray-400" />
                      <p className="text-xs text-gray-700 font-medium">Click or drag new document file</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Supports PDF, DOCX, TXT, or Images</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept=".pdf,.docx,.txt,.html,.png,.jpg,.jpeg"
                    className="hidden" 
                    ref={updateFileInputRef}
                    onChange={(e) => handleFileSelect(e, true)}
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2 justify-end border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!updateFile || isUpdatingVersion}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#DD7230] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#DD7230] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  {isUpdatingVersion ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Processing...</> : "Update Version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xs font-semibold text-gray-900">Upload New Document</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-gray-200 rounded-md transition-colors cursor-pointer text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Document Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                    placeholder="Enter document name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer">
                      <option>Policy</option>
                      <option>Procedure / Guideline</option>
                      <option>Branding Asset</option>
                      <option>Memorandum</option>
                      <option>Resolution</option>
                      <option>Forms / Templates</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Repository Scope</label>
                    <select name="scopeType" value={formData.scopeType} onChange={handleInputChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer">
                      {availableScopeTypes.includes("CAMPUS") && <option value="CAMPUS">Campus-wide</option>}
                      {availableScopeTypes.includes("OFFICE") && <option value="OFFICE">Office</option>}
                      {availableScopeTypes.includes("PROGRAM") && <option value="PROGRAM">Academic program</option>}
                    </select>
                  </div>
                </div>

                {formData.scopeType !== "CAMPUS" && <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">{formData.scopeType === "OFFICE" ? "Office" : "Academic Program"}</label>
                  <select name="scopeCode" value={formData.scopeCode} onChange={handleInputChange} disabled={formData.scopeType === "OFFICE" ? documentOffices.length === 1 : selectablePrograms.length === 1} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer disabled:cursor-not-allowed disabled:text-gray-600">
                    {formData.scopeType === "OFFICE"
                      ? documentOffices.map((office) => <option key={office} value={office}>{office}</option>)
                      : selectablePrograms.map((program) => <option key={program.code} value={program.code}>{program.label}</option>)}
                  </select>
                  {(formData.scopeType === "OFFICE" ? documentOffices.length : selectablePrograms.length) === 1 && <p className="mt-1 text-[11px] text-gray-500">This scope is fixed to your assigned {formData.scopeType === "OFFICE" ? "office" : "program"}.</p>}
                </div>}
                
                {(formData.category === "Forms / Templates" || formData.category === "Branding Asset") && (
                  <div className="flex items-start gap-2.5 p-3 mt-2 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium">
                      <strong>AI Indexing Bypassed:</strong> This file will be saved securely as a reference template for download and generation, but its contents will be excluded from the AI RAG search index.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Version</label>
                    <input
                      type="text"
                      name="version"
                      value={formData.version}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                      placeholder="e.g., v1.0, v2.5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Effectivity Date</label>
                    <input
                      type="date"
                      name="effectivityDate"
                      value={formData.effectivityDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Upload File</label>
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                      isDragging ? "border-[#DD7230] bg-orange-50/30" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                    }`}
                  >
                    {selectedFile ? (
                      <div className="flex flex-col items-center">
                        <FileText className="h-8 w-8 text-[#DD7230] mb-2" />
                        <p className="text-xs font-semibold text-gray-900">{selectedFile.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-xs text-gray-700 font-medium">Click or drag document file here</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">PDF, DOCX, TXT, HTML, or Image (Max 50 MB)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept=".pdf,.docx,.txt,.html,.png,.jpg,.jpeg"
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={(e) => handleFileSelect(e, false)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setSelectedFile(null)
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={!selectedFile || isUploading}
                className="px-4 py-1.5 text-xs font-semibold bg-[#DD7230] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#DD7230] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {isUploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Uploading...</> : "Upload Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-xl w-full shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xs font-semibold text-gray-900">Edit Document Metadata</h2>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-200 rounded-md transition-colors cursor-pointer text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Document Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Repository Scope</label>
                  <select name="scopeType" value={formData.scopeType} onChange={handleInputChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer">
                    {availableScopeTypes.includes("CAMPUS") && <option value="CAMPUS">Campus-wide</option>}
                    {availableScopeTypes.includes("OFFICE") && <option value="OFFICE">Office</option>}
                    {availableScopeTypes.includes("PROGRAM") && <option value="PROGRAM">Academic program</option>}
                  </select>
                </div>
                {formData.scopeType !== "CAMPUS" && <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">{formData.scopeType === "OFFICE" ? "Office" : "Academic Program"}</label>
                  <select name="scopeCode" value={formData.scopeCode} onChange={handleInputChange} disabled={formData.scopeType === "OFFICE" ? documentOffices.length === 1 : selectablePrograms.length === 1} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer disabled:cursor-not-allowed">
                    {formData.scopeType === "OFFICE"
                      ? documentOffices.map((office) => <option key={office} value={office}>{office}</option>)
                      : selectablePrograms.map((program) => <option key={program.code} value={program.code}>{program.label}</option>)}
                  </select>
                </div>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer">
                    <option>Policy</option>
                    <option>Procedure / Guideline</option>
                      <option>Branding Asset</option>
                    <option>Memorandum</option>
                    <option>Resolution</option>
                    <option>Forms / Templates</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <p className="text-[11px] leading-5 text-gray-500">AACCUP evidence is uploaded from Accreditation Support so its area and requirement cannot be omitted.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Version</label>
                  <input
                    type="text"
                    name="version"
                    value={formData.version}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Effectivity Date</label>
                  <input
                    type="date"
                    name="effectivityDate"
                    value={formData.effectivityDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={isEditing}
                className="px-4 py-1.5 text-xs font-semibold bg-[#DD7230] text-white rounded-lg hover:bg-[#DD7230] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {isEditing ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Saving...</> : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Type-to-Confirm Archive Modal */}
      {showDeleteModal && docToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-rose-50/50 flex justify-between items-center">
              <h2 className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                <Archive className="h-4 w-4" />
                Archive Document
              </h2>
              <button onClick={() => setShowDeleteModal(false)} className="p-1 hover:bg-rose-100 rounded-md transition-colors cursor-pointer text-rose-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                This action will remove this document from active searches and archive its historical record.
              </p>
              
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Document to archive:</p>
                <p className="text-xs font-semibold text-gray-900 truncate">{docToDelete.name}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Type <span className="font-semibold select-none text-gray-900">{docToDelete.name}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="Type document name here..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDocToDelete(null)
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeArchive}
                disabled={deleteConfirmText !== docToDelete.name || isArchiving}
                className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors disabled:bg-rose-300 disabled:cursor-not-allowed bg-rose-600 hover:bg-rose-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                 {isArchiving ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Archiving...</> : "Archive Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating upload queue panel is now rendered globally in DashboardLayout */}
      
    </div>
  )
}
