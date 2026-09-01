import { useState, useRef, useEffect } from "react"
import { Search, Filter, Upload, Download, Edit, Archive, Clock, Eye, CheckCircle, FileText, UploadCloud, X, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import axios from "axios"
import { useRole } from "../contexts/RoleContext"

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

export function KnowledgeRepository() {
  const { userRole } = useRole()
  const currentRole = userRole || "STUDENT"

  const canUpload = ["ADMIN", "FACULTY"].includes(currentRole)
  const canEdit = ["ADMIN", "FACULTY"].includes(currentRole)
  const canDelete = currentRole === "ADMIN"

  const [documents, setDocuments] = useState<any[]>([])
  
  // Background Upload Queue State
  const [activeUploads, setActiveUploads] = useState<BackgroundUploadTask[]>([])
  const [isQueueMinimized, setIsQueueMinimized] = useState(false)
  
  // --- TOAST NOTIFICATION STATE ---
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Modals State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingDocName, setEditingDocName] = useState("")
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

  const userDept = sessionStorage.getItem('userDepartment') || 'BSIT'

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedOffice, setSelectedOffice] = useState("all")
  const [selectedProgram, setSelectedProgram] = useState(currentRole === "FACULTY" ? userDept : "all")

  const [formData, setFormData] = useState({
    name: "",
    category: "Policy",
    office: "Academic Affairs",
    version: "",
    effectivityDate: ""
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadDocs = async () => {
      try {
        const res = await axios.get("http://localhost:8000/documents");
        setDocuments(res.data);
      } catch (error) {
        console.error("Failed to fetch documents", error);
      }
    };
    loadDocs();
  }, []);

  const getAccessBadge = () => {
    if (canUpload && canEdit) {
      // Changed to the updated amber scheme tint
      return { label: "Full Access", color: "bg-orange-50 text-[#D97E00] border-[#FF9501]/20", icon: CheckCircle }
    } else {
      // Changed to a neutral amber tint
      return { label: "View Only", color: "bg-[#FFF4E5] text-[#995900] border-[#FF9501]/10", icon: Eye }
    }
  }

  const accessBadge = getAccessBadge()

  const filteredDocuments = documents.filter((doc) => {
    // 1. STUDENTS: Accreditation Evidence is completely hidden for security/confidentiality
    if (currentRole === "STUDENT" && doc.category === "Accreditation Evidence") {
      return false; 
    }

    // 2. FACULTY: Program-Restricted filtering for Accreditation Evidence
    if (currentRole === "FACULTY" && doc.category === "Accreditation Evidence") {
      if (doc.program && doc.program !== "GLOBAL" && doc.program !== userDept) {
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
    const matchesOffice = selectedOffice === "all" || doc.office === selectedOffice;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      doc.name.toLowerCase().includes(searchLower) ||
      doc.category.toLowerCase().includes(searchLower) ||
      doc.office.toLowerCase().includes(searchLower) ||
      (doc.program && doc.program.toLowerCase().includes(searchLower)) ||
      (doc.effectivity_date && doc.effectivity_date.toLowerCase().includes(searchLower));
    
    return matchesCategory && matchesOffice && matchesProgram && matchesSearch;
  });

  const handleView = (doc: any) => {
    if (doc.file_url) {
      const userEmail = sessionStorage.getItem('userEmail') || 'Unknown';
      const userRole = sessionStorage.getItem('userRole') || 'STUDENT';

      axios.post("http://localhost:8000/audit/access", {
        document_name: doc.name,
        action_type: "View",
        user_email: userEmail,
        user_role: userRole
      }).catch(err => console.error("Silently failed to log access"));
          window.open(doc.file_url, "_blank");
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

      axios.post("http://localhost:8000/audit/access", {
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
    setFormData({
      name: doc.name,
      category: doc.category,
      office: doc.office,
      version: doc.version,
      effectivityDate: doc.effectivity_date !== "N/A" ? doc.effectivity_date : ""
    })
    setEditingDocName(doc.name)
    setShowEditModal(true)
  }

  const handleEditSubmit = async () => {
    if (!formData.name || !formData.version || !formData.effectivityDate) {
      showToast("Please fill out all fields.", "error")
      return
    }
    setIsEditing(true)
    try {
      await axios.put("http://localhost:8000/documents/update", {
        old_name: editingDocName,
        new_name: formData.name,
        category: formData.category,
        office: formData.office,
        version: formData.version,
        effectivity_date: formData.effectivityDate
      })
      setShowEditModal(false)
      setFormData({ name: "", category: "Policy", office: "Academic Affairs", version: "", effectivityDate: "" })
      const res = await axios.get("http://localhost:8000/documents")
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
      await axios.delete(`http://localhost:8000/documents/${encodeURIComponent(docToDelete.name)}`)
      setShowDeleteModal(false)
      setDocToDelete(null)
      setDeleteConfirmText("")
      const res = await axios.get("http://localhost:8000/documents")
      setDocuments(res.data)
      showToast("Document successfully archived!", "success")
    } catch (error) {
      showToast("Failed to archive document.", "error")
    } finally {
      setIsArchiving(false)
    }
  }

  const handleUpdateVersionClick = (doc: any) => {
    setDocToUpdate(doc)
    setUpdateFormData({ version: "", effectivityDate: "" })
    setUpdateFile(null)
    setShowUpdateModal(true)
  }

  // --- BACKGROUND UPLOAD QUEUE HANDLERS ---
  const cancelUploadTask = (taskId: string) => {
    setActiveUploads(prev => prev.map(t => {
      if (t.id === taskId) {
        t.abortController.abort()
        return { ...t, status: 'cancelled', statusText: 'Upload cancelled by user', progress: 0 }
      }
      return t
    }))
  }

  const removeUploadTask = (taskId: string) => {
    setActiveUploads(prev => prev.filter(t => t.id !== taskId))
  }

  const startBackgroundUpload = async (
    taskId: string,
    endpoint: string,
    submitData: FormData,
    controller: AbortController,
    docName: string,
    isVersionUpdate = false
  ) => {
    try {
      await axios.post(endpoint, submitData, {
        signal: controller.signal,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded || 0
          const total = progressEvent.total || 1
          const uploadPercentage = Math.min(50, Math.round((loaded * 50) / total))
          
          setActiveUploads(prev => prev.map(t => {
            if (t.id === taskId && t.status !== 'cancelled') {
              const statusText = uploadPercentage < 50 
                ? `Transferring document file (${uploadPercentage * 2}%)...` 
                : 'Analyzing document content & indexing...'
              const status = uploadPercentage < 50 ? 'uploading' : 'vectorizing'
              return { ...t, progress: uploadPercentage, statusText, status }
            }
            return t
          }))
        }
      })

      // Update to processing step
      setActiveUploads(prev => prev.map(t => {
        if (t.id === taskId && t.status !== 'cancelled') {
          return { ...t, progress: 85, status: 'vectorizing', statusText: 'Finalizing document record...' }
        }
        return t
      }))

      // Complete task
      setTimeout(() => {
        setActiveUploads(prev => prev.map(t => {
          if (t.id === taskId && t.status !== 'cancelled') {
            return { ...t, progress: 100, status: 'completed', statusText: 'Document active & searchable!' }
          }
          return t
        }))

        // Refresh documents list
        axios.get("http://localhost:8000/documents").then(res => setDocuments(res.data)).catch(console.error)
        showToast(isVersionUpdate ? `New version of "${docName}" successfully published!` : `"${docName}" successfully added to repository!`, 'success')
      }, 600)

    } catch (error: any) {
      if (axios.isCancel(error) || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        setActiveUploads(prev => prev.map(t => {
          if (t.id === taskId) {
            return { ...t, status: 'cancelled', statusText: 'Upload cancelled by user', progress: 0 }
          }
          return t
        }))
        showToast(`Upload of "${docName}" was cancelled.`, 'error')
      } else {
        setActiveUploads(prev => prev.map(t => {
          if (t.id === taskId) {
            return { ...t, status: 'error', statusText: 'Document processing failed.', progress: 0 }
          }
          return t
        }))
        showToast(`Upload of "${docName}" failed. Please check network.`, 'error')
      }
    }
  }

  const handleUpdateVersionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateFile || !updateFormData.version || !updateFormData.effectivityDate || !docToUpdate) {
      showToast("Please provide the new file, version, and effectivity date.", "error");
      return;
    }

    const taskId = "update_" + Date.now()
    const controller = new AbortController()

    const submitData = new FormData();
    submitData.append("file", updateFile);
    submitData.append("old_document_name", docToUpdate.name);
    submitData.append("new_version", updateFormData.version);
    submitData.append("new_effectivity_date", updateFormData.effectivityDate);

    const newTask: BackgroundUploadTask = {
      id: taskId,
      docName: docToUpdate.name,
      category: docToUpdate.category || "Document",
      office: docToUpdate.office || "",
      version: updateFormData.version,
      fileName: updateFile.name,
      progress: 5,
      status: 'uploading',
      statusText: 'Initializing version update...',
      abortController: controller,
      isVersionUpdate: true
    }

    setActiveUploads(prev => [...prev, newTask])

    // Immediately close modal & reset fields so user can navigate away
    setShowUpdateModal(false);
    setUpdateFile(null);
    setDocToUpdate(null);
    showToast(`Version update for "${docToUpdate.name}" started in background!`, 'success')

    startBackgroundUpload(taskId, "http://localhost:8000/upload-new-version", submitData, controller, newTask.docName, true)
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
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleUploadSubmit = () => {
    if (!selectedFile || !formData.name || !formData.version || !formData.effectivityDate) {
      showToast("Please fill out all fields and select a file.", "error")
      return
    }

    const taskId = "task_" + Date.now()
    const controller = new AbortController()

    const submitData = new FormData()
    submitData.append("file", selectedFile)
    submitData.append("name", formData.name)
    submitData.append("category", formData.category)
    submitData.append("office", formData.office)
    submitData.append("version", formData.version)
    submitData.append("effectivity_date", formData.effectivityDate)

    const newTask: BackgroundUploadTask = {
      id: taskId,
      docName: formData.name,
      category: formData.category,
      office: formData.office,
      version: formData.version,
      fileName: selectedFile.name,
      progress: 5,
      status: 'uploading',
      statusText: 'Initializing upload...',
      abortController: controller
    }

    setActiveUploads(prev => [...prev, newTask])
    
    // Immediately close modal & reset fields so user can leave
    setShowUploadModal(false)
    setSelectedFile(null)
    setFormData({ name: "", category: "Policy", office: "Academic Affairs", version: "", effectivityDate: "" })
    showToast(`Upload of "${newTask.docName}" started in background!`, 'success')

    startBackgroundUpload(taskId, "http://localhost:8000/upload-document", submitData, controller, newTask.docName)
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)] relative">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium z-[100] transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
          toast.type === 'success' 
            ? 'bg-[#FFF4E5] text-[#D97E00] border border-[#FF9501]/30' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4 text-[#FF9501]" /> : <AlertCircle className="h-4 w-4 text-rose-500" />}
          {toast.message}
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

            {activeUploads.some(t => t.status === 'uploading' || t.status === 'vectorizing') && (
              <button
                onClick={() => setIsQueueMinimized(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-[#D97E00] border border-[#FF9501]/30 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
                title="View active ingestion progress"
              >
                <UploadCloud className="h-3.5 w-3.5 text-[#FF9501] animate-bounce" />
                <span>Ingesting ({activeUploads.filter(t => t.status === 'uploading' || t.status === 'vectorizing').length})</span>
              </button>
            )}

            {canUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FF9501] text-white text-xs font-semibold rounded-lg hover:bg-[#D97E00] transition-all cursor-pointer shadow-2xs active:scale-95"
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
                className="w-full pl-9 pr-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <select
                className="sm:w-44 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] text-gray-700 cursor-pointer transition-colors"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="Policy">Policy</option>
                <option value="Procedure / Guideline">Procedure / Guideline</option>
                <option value="Memorandum">Memorandum</option>
                <option value="Resolution">Resolution</option>
                <option value="Accreditation Evidence">Accreditation Evidence</option>
                <option value="Forms / Templates">Forms / Templates</option>
                <option value="Other">Other</option>
              </select>
              
              <select
                className="sm:w-44 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] text-gray-700 cursor-pointer transition-colors"
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
              >
                <option value="all">All Offices</option>
                <option value="Academic Affairs">Academic Affairs</option>
                <option value="Student Affairs">Student Affairs</option>
                <option value="Research Office">Research Office</option>
                <option value="Quality Assurance">Quality Assurance</option>
              </select>

              <select
                className="sm:w-44 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] text-gray-700 cursor-pointer transition-colors"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                disabled={currentRole === "FACULTY"}
              >
                <option value="all">All Programs</option>
                <option value="BSIT">BSIT</option>
                <option value="BEED">BEED</option>
                <option value="BSED_MATH">BSEd Math</option>
                <option value="BSED_ENGLISH">BSEd English</option>
                <option value="BTLED_HE">BTLEd HE</option>
                <option value="AB_ELS">AB ELS</option>
                <option value="AB_LIT">AB Lit</option>
                <option value="AB_PSYCH">AB Psych</option>
                <option value="BSF">BSF</option>
                <option value="BSA">BSA</option>
                <option value="BSES">BSES</option>
                <option value="BSIE">BSIE</option>
                <option value="BIT_AT">BIT-AT</option>
                <option value="BIT_CT">BIT-CT</option>
                <option value="BIT_DT">BIT-DT</option>
                <option value="BIT_ET">BIT-ET</option>
                <option value="BIT_GT">BIT-GT</option>
                <option value="BSHM">BSHM</option>
                <option value="BSTM">BSTM</option>
                <option value="GLOBAL">Global Campus</option>
              </select>
            </div>
          </div>
        </div>
      </div>

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
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 overflow-hidden">
                      <div className="text-xs font-semibold text-gray-900 truncate" title={doc.name}>{doc.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 truncate">{doc.status === "Archived" ? "Historical Record" : "Active File"}</div>
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
                        doc.status === "Archived" 
                          ? "bg-gray-100 text-gray-600 border-gray-200" 
                          : "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      }`}>
                        {doc.status || "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleView(doc)} className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-1" title="View Document">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDownload(doc)} className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-1" title="Download">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {canEdit && doc.status !== "Archived" && (
                          <>
                            <button onClick={() => handleUpdateVersionClick(doc)} className="text-gray-400 hover:text-[#FF9501] transition-colors cursor-pointer p-1" title="Upload New Version">
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
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
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
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer"
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
                    isDragging ? "border-[#FF9501] bg-orange-50/30" : "border-gray-200 hover:border-gray-300 bg-gray-50/40"
                  }`}
                >
                  {updateFile ? (
                    <div className="flex flex-col items-center">
                      <FileText className="h-6 w-6 text-[#FF9501] mb-1.5" />
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
                    accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
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
                  className="px-4 py-1.5 text-xs font-semibold bg-[#FF9501] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#D97E00] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
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
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                    placeholder="Enter document name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer">
                      <option>Policy</option>
                      <option>Procedure / Guideline</option>
                      <option>Memorandum</option>
                      <option>Resolution</option>
                      <option>Accreditation Evidence</option>
                      <option>Forms / Templates</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Office</label>
                    <select name="office" value={formData.office} onChange={handleInputChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer">
                      <option>Academic Affairs</option>
                      <option>Student Affairs</option>
                      <option>Research Office</option>
                      <option>Quality Assurance</option>
                    </select>
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
                      className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
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
                      className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer"
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
                      isDragging ? "border-[#FF9501] bg-orange-50/30" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                    }`}
                  >
                    {selectedFile ? (
                      <div className="flex flex-col items-center">
                        <FileText className="h-8 w-8 text-[#FF9501] mb-2" />
                        <p className="text-xs font-semibold text-gray-900">{selectedFile.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-xs text-gray-700 font-medium">Click or drag document file here</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">PDF, DOCX, TXT, or Image (Max 25MB)</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
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
                className="px-4 py-1.5 text-xs font-semibold bg-[#FF9501] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#D97E00] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
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
                  className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer">
                    <option>Policy</option>
                    <option>Procedure / Guideline</option>
                    <option>Memorandum</option>
                    <option>Resolution</option>
                    <option>Accreditation Evidence</option>
                    <option>Forms / Templates</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Office</label>
                  <select name="office" value={formData.office} onChange={handleInputChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer">
                    <option>Academic Affairs</option>
                    <option>Student Affairs</option>
                    <option>Research Office</option>
                    <option>Quality Assurance</option>
                  </select>
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
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Effectivity Date</label>
                  <input
                    type="date"
                    name="effectivityDate"
                    value={formData.effectivityDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer"
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
                className="px-4 py-1.5 text-xs font-semibold bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs"
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

      {/* --- BACKGROUND INGESTION TASK MANAGER FLOATING PANEL --- */}
      {activeUploads.length > 0 && (
        <div className="fixed top-20 right-6 z-50 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in slide-in-from-top-3 fade-in duration-200">
          {/* Header */}
          <div className="px-4 py-2.5 bg-gray-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-[#FF9501] animate-bounce" />
              <span className="text-xs font-semibold">
                Ingestion Queue ({activeUploads.filter(t => t.status === 'uploading' || t.status === 'vectorizing').length} Active)
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsQueueMinimized(!isQueueMinimized)}
                className="p-1 text-gray-400 hover:text-white rounded transition-colors cursor-pointer"
                title={isQueueMinimized ? "Expand Queue" : "Minimize Queue"}
              >
                {isQueueMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Body */}
          {!isQueueMinimized && (
            <div className="p-3.5 max-h-72 overflow-y-auto divide-y divide-gray-100 space-y-2.5">
              {activeUploads.map((task) => (
                <div key={task.id} className="pt-2 first:pt-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-gray-900 text-xs truncate max-w-[180px]" title={task.docName}>
                          {task.docName}
                        </span>
                        <span className="px-1.5 py-0.2 bg-gray-100 text-gray-700 text-[9px] font-medium uppercase rounded">
                          v{task.version}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5" title={task.fileName}>{task.fileName}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(task.status === 'uploading' || task.status === 'vectorizing') && (
                        <button
                          onClick={() => cancelUploadTask(task.id)}
                          className="px-2 py-0.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-[10px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1"
                          title="Cancel Upload Task"
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                      )}

                      {(task.status === 'completed' || task.status === 'error' || task.status === 'cancelled') && (
                        <button
                          onClick={() => removeUploadTask(task.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                          title="Dismiss Task"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          task.status === 'completed'
                            ? 'bg-emerald-600'
                            : task.status === 'error' || task.status === 'cancelled'
                            ? 'bg-rose-500'
                            : 'bg-[#FF9501]'
                        }`}
                        style={{ width: `${task.status === 'completed' ? 100 : task.progress}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                      <span className="flex items-center gap-1">
                        {(task.status === 'uploading' || task.status === 'vectorizing') && (
                          <Loader2 className="h-3 w-3 animate-spin text-[#FF9501]" />
                        )}
                        {task.status === 'completed' && <CheckCircle className="h-3 w-3 text-emerald-600" />}
                        {task.status === 'cancelled' && <AlertCircle className="h-3 w-3 text-rose-500" />}
                        {task.statusText}
                      </span>
                      <span className="font-semibold text-gray-700">{task.status === 'completed' ? '100%' : `${task.progress}%`}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
    </div>
  )
}