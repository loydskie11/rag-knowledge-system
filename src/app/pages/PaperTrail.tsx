import { useState, useEffect, useRef } from "react";
import {
  Search, Plus, FileCheck, CheckCircle2, AlertCircle,
  FileText, Send, Printer, X, Loader2,
  ChevronRight, History, QrCode, ExternalLink
} from "lucide-react";
import axios from "axios";
import { useRole } from "../contexts/RoleContext";
import { ISO_OFFICES_16, CAMPUS_COLLEGES, CAMPUS_PROGRAMS } from "./UsersRoles";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface PaperTrailLog {
  id: string;
  record_id: string;
  action: string;
  status: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
  notes?: string;
  timestamp: string;
}

interface PaperTrailRecord {
  id: string;
  tracking_number: string;
  title: string;
  document_type: string;
  office: string;
  sender_name: string;
  sender_email: string;
  sender_role: string;
  recipient_name?: string;
  recipient_email?: string;
  recipient_role?: string;
  origin_office?: string;
  origin_person?: string;
  current_location?: string;
  transaction_type?: string;
  status: string;
  remarks?: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
  logs: PaperTrailLog[];
}

export function PaperTrail() {
  const { userRole } = useRole();
  const currentRole = userRole || "FACULTY";

  const userEmail = sessionStorage.getItem("userEmail") || "faculty@ctu.edu.ph";
  const userName = sessionStorage.getItem("userName") || "Faculty Member";

  const [records, setRecords] = useState<PaperTrailRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedOffice, setSelectedOffice] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Action Board View Tabs (Inbox vs Outbox vs All)
  const [actionBoardTab, setActionBoardTab] = useState<"inbox" | "outbox" | "all">("inbox");

  // Top-Down "Request Document" States (Phase 3)
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    title: "",
    document_type: "Curriculum Map",
    office: "Academic Affairs",
    target_person_name: "",
    target_person_email: "",
    instructions: "",
  });

  // "Fulfill Request" States (Phase 3)
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [selectedRecordForFulfill, setSelectedRecordForFulfill] = useState<PaperTrailRecord | null>(null);
  const [fulfillFile, setFulfillFile] = useState<File | null>(null);
  const [fulfillRemarks, setFulfillRemarks] = useState("");
  const [isSubmittingFulfill, setIsSubmittingFulfill] = useState(false);
  const fulfillFileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRecordForStatus, setSelectedRecordForStatus] = useState<PaperTrailRecord | null>(null);
  const [actionType, setActionType] = useState<"Acknowledge" | "Forward" | "Return" | "Approve">("Acknowledge");
  const [targetOffice, setTargetOffice] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedRecordForTimeline, setSelectedRecordForTimeline] = useState<PaperTrailRecord | null>(null);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedRecordForReceipt, setSelectedRecordForReceipt] = useState<PaperTrailRecord | null>(null);

  // New Record Form Data
  const [formData, setFormData] = useState({
    title: "",
    document_type: "Syllabus",
    office: "Academic Affairs",
    recipient_name: "",
    recipient_email: "",
    transaction_type: "Submission",
    remarks: "",
  });
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Paper Trails
  const fetchPaperTrails = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/paper-trail`, {
        params: {
          role: currentRole,
          email: userEmail,
        },
      });
      setRecords(res.data || []);
    } catch (err) {
      console.error("Failed to load paper trails", err);
      showToast("Failed to fetch document tracking records", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaperTrails();
  }, [currentRole, userEmail]);

  // Submit Top-Down Document Request (Director -> Faculty)
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestFormData.title || !requestFormData.target_person_email) {
      showToast("Please enter document title and target recipient email.", "error");
      return;
    }

    setIsSubmittingRequest(true);
    try {
      await axios.post(`${API_BASE}/paper-trail/request`, {
        title: requestFormData.title,
        document_type: requestFormData.document_type,
        office: requestFormData.office,
        target_person_name: requestFormData.target_person_name || "Faculty Member",
        target_person_email: requestFormData.target_person_email,
        instructions: requestFormData.instructions || undefined,
      });

      showToast(`Document Request issued & assigned to ${requestFormData.target_person_name}!`, "success");
      setShowRequestModal(false);
      setRequestFormData({
        title: "",
        document_type: "Curriculum Map",
        office: "Academic Affairs",
        target_person_name: "",
        target_person_email: "",
        instructions: "",
      });
      fetchPaperTrails();
    } catch (err) {
      console.error("Failed to create document request", err);
      showToast("Failed to issue document request.", "error");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Submit Fulfill Request (Faculty -> Director)
  const handleFulfillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForFulfill || !fulfillFile) {
      showToast("Please select a file to attach for request fulfillment.", "error");
      return;
    }

    setIsSubmittingFulfill(true);
    try {
      const fileForm = new FormData();
      fileForm.append("file", fulfillFile);
      const uploadRes = await axios.post(`${API_BASE}/paper-trail/upload`, fileForm, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedUrl = uploadRes.data.file_url;

      await axios.put(`${API_BASE}/paper-trail/${selectedRecordForFulfill.id}/fulfill`, {
        file_url: uploadedUrl,
        remarks: fulfillRemarks || undefined,
      });

      showToast(`Request fulfilled! Document routed back to ${selectedRecordForFulfill.sender_name}.`, "success");
      setShowFulfillModal(false);
      setSelectedRecordForFulfill(null);
      setFulfillFile(null);
      setFulfillRemarks("");
      fetchPaperTrails();
    } catch (err) {
      console.error("Failed to fulfill request", err);
      showToast("Failed to fulfill document request.", "error");
    } finally {
      setIsSubmittingFulfill(false);
    }
  };

  // Create & Release Document
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.office) {
      showToast("Please complete the document title and target office.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedUrl: string | undefined = undefined;

      if (attachedFile) {
        const fileForm = new FormData();
        fileForm.append("file", attachedFile);
        const uploadRes = await axios.post(`${API_BASE}/paper-trail/upload`, fileForm, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedUrl = uploadRes.data.file_url;
      }

      await axios.post(`${API_BASE}/paper-trail`, {
        title: formData.title,
        document_type: formData.document_type,
        office: formData.office,
        sender_name: userName,
        sender_email: userEmail,
        sender_role: currentRole,
        recipient_name: formData.recipient_name || undefined,
        recipient_email: formData.recipient_email || undefined,
        recipient_role: "ADMIN",
        origin_office: sessionStorage.getItem('userAdministrativeOffice') || sessionStorage.getItem('userDepartment') || formData.office,
        origin_person: userName,
        current_location: formData.office,
        transaction_type: formData.transaction_type,
        remarks: formData.remarks || undefined,
        file_url: uploadedUrl,
      });

      showToast("Document tracking record created and routed successfully!", "success");
      setShowCreateModal(false);
      setFormData({
        title: "",
        document_type: "Syllabus",
        office: "Academic Affairs",
        recipient_name: "",
        recipient_email: "",
        transaction_type: "Submission",
        remarks: "",
      });
      setAttachedFile(null);
      fetchPaperTrails();
    } catch (err) {
      console.error("Failed to release document", err);
      showToast("Failed to create document tracking record.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status & Routing Action Submit
  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForStatus) return;

    let computedStatus = "Received";
    if (actionType === "Forward") computedStatus = "Forwarded";
    else if (actionType === "Return") computedStatus = "Needs Revision";
    else if (actionType === "Approve") computedStatus = "Approved";

    setIsUpdatingStatus(true);
    try {
      await axios.put(`${API_BASE}/paper-trail/${selectedRecordForStatus.id}/status`, {
        status: computedStatus,
        action_type: actionType,
        target_office: targetOffice || undefined,
        actor_name: userName,
        actor_email: userEmail,
        actor_role: currentRole,
        notes: statusNotes || undefined,
      });

      showToast(`Routing action completed successfully!`, "success");
      setShowStatusModal(false);
      setSelectedRecordForStatus(null);
      setTargetOffice("");
      setStatusNotes("");
      fetchPaperTrails();
    } catch (err) {
      console.error("Failed to update routing status", err);
      showToast("Failed to complete routing action.", "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Filters & Search
  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.office.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.current_location && rec.current_location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = selectedStatus === "all" || rec.status === selectedStatus;
    const matchesOffice = selectedOffice === "all" || rec.office === selectedOffice;
    const matchesType = selectedType === "all" || rec.document_type === selectedType;

    return matchesSearch && matchesStatus && matchesOffice && matchesType;
  });

  // Action Board Filtering (Inbox vs Outbox vs Campus All)
  const actionBoardRecords = filteredRecords.filter((rec) => {
    const myOffice = sessionStorage.getItem("userAdministrativeOffice") || sessionStorage.getItem("userDepartment") || "";
    if (actionBoardTab === "inbox") {
      return (
        (rec.current_location && rec.current_location.toLowerCase().includes(myOffice.toLowerCase())) ||
        (rec.office && rec.office.toLowerCase().includes(myOffice.toLowerCase())) ||
        (rec.recipient_email && rec.recipient_email.toLowerCase() === userEmail.toLowerCase()) ||
        (rec.status === "Pending Request" && rec.recipient_email === userEmail)
      );
    }
    if (actionBoardTab === "outbox") {
      return (
        (rec.sender_email && rec.sender_email.toLowerCase() === userEmail.toLowerCase()) ||
        (rec.origin_person && rec.origin_person.toLowerCase() === userName.toLowerCase())
      );
    }
    return true;
  });

  // Metrics
  const totalTracked = records.length;
  const pendingReceiving = records.filter((r) => r.status === "Pending Receiving" || r.status === "Forwarded").length;
  const approvedCount = records.filter((r) => r.status === "Approved").length;
  const needsRevisionCount = records.filter((r) => r.status === "Needs Revision").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return { label: "Approved", bg: "bg-emerald-50 text-emerald-700 border-emerald-200/60" };
      case "Needs Revision":
        return { label: "Needs Revision", bg: "bg-rose-50 text-rose-700 border-rose-200/60" };
      case "Received":
        return { label: "Received", bg: "bg-slate-100 text-slate-700 border-slate-200" };
      case "Forwarded":
        return { label: "In Transit", bg: "bg-blue-50 text-blue-700 border-blue-200/60" };
      case "Under Review":
        return { label: "Under Review", bg: "bg-amber-50 text-amber-700 border-amber-200/60" };
      case "Released":
        return { label: "Released", bg: "bg-slate-100 text-slate-700 border-slate-200" };
      default:
        return { label: "Pending", bg: "bg-amber-50/70 text-amber-800 border-amber-200/50" };
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6 flex flex-col min-h-[calc(100vh-6rem)] relative">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 text-sm font-bold z-[100] transition-all animate-in slide-in-from-bottom-5 ${
            toast.type === "success"
              ? "bg-[#FFF4E5] text-[#D97E00] border-2 border-[#FF9501]/20"
              : "bg-red-50 text-red-700 border-2 border-red-200"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex-none space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#1F2937]">Document Tracking System (DTS)</h1>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
              Multi-way office routing engine & physical / digital document location tracking
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all cursor-pointer text-xs sm:text-sm font-medium w-full sm:w-auto shadow-xs"
            >
              <Send className="h-3.5 w-3.5 text-gray-500" />
              <span>Request Document</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] transition-all cursor-pointer text-xs sm:text-sm font-medium w-full sm:w-auto shadow-xs active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Route New Document</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Tracked */}
          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs hover:border-gray-300 transition-colors">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Tracked</p>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-bold text-gray-900">{totalTracked}</h3>
              <span className="text-[11px] text-gray-500">In paper trail</span>
            </div>
          </div>

          {/* Pending Receiving */}
          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs hover:border-gray-300 transition-colors">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Pending Receiving</p>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-bold text-gray-900">{pendingReceiving}</h3>
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">Awaiting receipt</span>
            </div>
          </div>

          {/* Verified / Approved */}
          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs hover:border-gray-300 transition-colors">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Approved & Closed</p>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-bold text-gray-900">{approvedCount}</h3>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">Completed</span>
            </div>
          </div>

          {/* Needs Revision */}
          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs hover:border-gray-300 transition-colors">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Needs Revision</p>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-bold text-gray-900">{needsRevisionCount}</h3>
              <span className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">Returned</span>
            </div>
          </div>
        </div>

        {/* Action Board Tab Switcher */}
        <div className="flex border-b border-gray-200 gap-1 pt-1 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            onClick={() => setActionBoardTab("inbox")}
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
              actionBoardTab === "inbox"
                ? "border-[#FF9501] text-[#D97E00] bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
            }`}
          >
            Action Board Inbox
            <span className="ml-1 px-1.5 py-0.2 bg-gray-200/70 text-gray-700 rounded text-[10px]">
              {records.filter((r) => {
                const myOffice = (sessionStorage.getItem("userAdministrativeOffice") || sessionStorage.getItem("userDepartment") || "").toLowerCase();
                return (r.current_location && r.current_location.toLowerCase().includes(myOffice)) ||
                  (r.recipient_email && r.recipient_email.toLowerCase() === userEmail.toLowerCase());
              }).length}
            </span>
          </button>

          <button
            onClick={() => setActionBoardTab("outbox")}
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
              actionBoardTab === "outbox"
                ? "border-[#FF9501] text-[#D97E00] bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
            }`}
          >
            Action Board Outbox
          </button>

          <button
            onClick={() => setActionBoardTab("all")}
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer shrink-0 ${
              actionBoardTab === "all"
                ? "border-[#FF9501] text-[#D97E00] bg-white rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
            }`}
          >
            All Campus Documents
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search by Tracking #, Document Title, Sender, or Office..."
                className="w-full pl-11 pr-4 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3">
              <select
                className="w-full sm:w-44 px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] text-[#374151] cursor-pointer"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Pending Receiving">Pending Receiving</option>
                <option value="Received">Received</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved (Paper OK)</option>
                <option value="Needs Revision">Needs Revision</option>
                <option value="Released">Released</option>
              </select>

              <select
                className="w-full sm:w-52 px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] text-[#374151] cursor-pointer"
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
              >
                <option value="all">All Offices & Colleges</option>
                <optgroup label="Academic Colleges & Departments">
                  {CAMPUS_COLLEGES.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </optgroup>
                <optgroup label="Administrative & ISO Offices">
                  {ISO_OFFICES_16.map((off) => (
                    <option key={off} value={off}>{off}</option>
                  ))}
                </optgroup>
              </select>

              <select
                className="w-full sm:w-44 px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] text-[#374151] cursor-pointer"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">All Document Types</option>
                <option value="Syllabus">Syllabus</option>
                <option value="Transmittal Sheet">Transmittal Sheet</option>
                <option value="Grade Sheet">Grade Sheet</option>
                <option value="Clearance Form">Clearance Form</option>
                <option value="Accreditation Document">Accreditation Document</option>
                <option value="MOA / MOU">MOA / MOU</option>
                <option value="Administrative Report">Administrative Report</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200/80 shadow-2xs flex flex-col overflow-hidden min-h-[300px]">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mb-3" />
            <p className="text-sm font-medium">Loading paper trail records...</p>
          </div>
        ) : actionBoardRecords.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-500 text-center">
            <FileCheck className="h-10 w-10 text-gray-300 mb-3 stroke-[1.5]" />
            <h3 className="text-base font-semibold text-gray-900">No Paper Trail Records Found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md">
              There are no document movement logs matching your search or filter. Release a new document to start tracking!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-[#FF9501] text-white text-xs font-semibold rounded-lg hover:bg-[#D97E00] transition-colors cursor-pointer shadow-2xs"
            >
              Release Document
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full whitespace-nowrap text-left border-collapse">
              <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-200 sticky top-0 z-20">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Tracking #</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Document Title & Type</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Location & Origin</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {actionBoardRecords.map((rec) => {
                  const badge = getStatusBadge(rec.status);

                  const myAdminOffice = (sessionStorage.getItem("userAdministrativeOffice") || "").toLowerCase();
                  const myDept = (sessionStorage.getItem("userDepartment") || "").toLowerCase();

                  const isPendingMyFulfillment = rec.status === "Pending Request" && (
                    (rec.recipient_email && rec.recipient_email.toLowerCase() === userEmail.toLowerCase()) ||
                    (myDept.length > 0 && rec.office.toLowerCase().includes(myDept)) ||
                    (myAdminOffice.length > 0 && rec.office.toLowerCase().includes(myAdminOffice))
                  );

                  const isRecipient = !!rec.recipient_email && rec.recipient_email.toLowerCase() === userEmail.toLowerCase();
                  const currentLocationLower = (rec.current_location || rec.office || "").toLowerCase();
                  const isAtMyOffice = (
                    (myAdminOffice.length > 0 && currentLocationLower.includes(myAdminOffice)) ||
                    (myDept.length > 0 && currentLocationLower.includes(myDept))
                  );

                  // Strict RBAC Governance Lock: Admin (God view) OR explicitly assigned recipient OR sitting at user's office/dept
                  const canTakeAction = currentRole === "ADMIN" || isRecipient || isAtMyOffice;

                  return (
                    <tr key={rec.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-semibold text-xs text-gray-900">{rec.tracking_number}</div>
                        <div className="mt-0.5">
                          <span className="px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded text-[9px] font-medium uppercase tracking-wider">
                            {rec.transaction_type || "Submission"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-medium text-xs text-gray-900 truncate max-w-xs" title={rec.title}>
                          {rec.title}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>{rec.document_type}</span>
                          {rec.file_url && (
                            <a
                              href={rec.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gray-600 hover:text-gray-900 hover:underline flex items-center gap-0.5 text-[10px]"
                            >
                              <ExternalLink className="h-2.5 w-2.5" /> Attachment
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="text-xs font-medium text-gray-800">
                          {rec.current_location || rec.office}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          From: {rec.origin_office || rec.office} ({rec.origin_person || rec.sender_name})
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-0.5 inline-flex items-center text-[11px] font-medium rounded-md border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Timeline / History */}
                          <button
                            onClick={() => {
                              setSelectedRecordForTimeline(rec);
                              setShowTimelineModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                            title="View History"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>

                          {/* Print Receipt */}
                          <button
                            onClick={() => {
                              setSelectedRecordForReceipt(rec);
                              setShowReceiptModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                            title="Print Slip"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>

                          {/* Fulfill Request Button */}
                          {isPendingMyFulfillment ? (
                            <button
                              onClick={() => {
                                setSelectedRecordForFulfill(rec);
                                setFulfillFile(null);
                                setFulfillRemarks("");
                                setShowFulfillModal(true);
                              }}
                              className="px-2.5 py-1 text-xs font-medium bg-[#FF9501] text-white hover:bg-[#D97E00] rounded-md transition-all cursor-pointer shadow-2xs"
                              title="Fulfill Request"
                            >
                              Fulfill
                            </button>
                          ) : canTakeAction ? (
                            /* Take Action */
                            <button
                              onClick={() => {
                                setSelectedRecordForStatus(rec);
                                setActionType("Acknowledge");
                                setTargetOffice("");
                                setStatusNotes("");
                                setShowStatusModal(true);
                              }}
                              className="px-2.5 py-1 text-xs font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md transition-all cursor-pointer shadow-2xs"
                              title="Route / Update Status"
                            >
                              Action
                            </button>
                          ) : null}
                        </div>
                      </td>

                      {/* Last Updated Column */}
                      <td className="px-5 py-3.5 text-[11px] text-gray-400 text-right">
                        {new Date(rec.updated_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE & RELEASE DOCUMENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Create & Release Document</h2>
                <p className="text-xs text-gray-500 mt-0.5">Initialize a new movement record and generate tracking number</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 CS Curriculum Syllabus Revision"
                  className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer text-gray-800"
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  >
                    <option value="Syllabus">Syllabus</option>
                    <option value="Transmittal Sheet">Transmittal Sheet</option>
                    <option value="Grade Sheet">Grade Sheet</option>
                    <option value="Clearance Form">Clearance Form</option>
                    <option value="Accreditation Document">Accreditation Document</option>
                    <option value="MOA / MOU">MOA / MOU</option>
                    <option value="Administrative Report">Administrative Report</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Originating Office / College <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer text-gray-800"
                    value={formData.office}
                    onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                  >
                    <optgroup label="Academic Colleges & Departments">
                      {CAMPUS_COLLEGES.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Administrative & ISO Offices">
                      {ISO_OFFICES_16.map((off) => (
                        <option key={off} value={off}>{off}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Recipient Office / Destination College <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer text-gray-800"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                >
                  <option value="" disabled>Select destination office or college</option>
                  <optgroup label="Academic Colleges & Departments">
                    {CAMPUS_COLLEGES.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Administrative & ISO Offices">
                    {ISO_OFFICES_16.map((off) => (
                      <option key={off} value={off}>{off}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Direct Recipient Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. dean.office@ctu.edu.ph"
                  className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                  value={formData.recipient_email}
                  onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Routing Remarks / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. For Dean signature and formal endorsement."
                  className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] resize-none"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Attach Digital Copy (Optional)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-gray-300 hover:border-[#FF9501] bg-gray-50/50 hover:bg-orange-50/20 rounded-lg p-4 text-center cursor-pointer transition-colors"
                >
                  {attachedFile ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-800">
                      <FileText className="h-3.5 w-3.5 text-[#FF9501]" />
                      <span>{attachedFile.name}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Click to attach PDF, Word, or image copy</p>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 text-xs font-semibold bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] transition-colors flex justify-center items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                    </>
                  ) : (
                    "Release & Create Tracking"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAKE ACTION & ROUTE DOCUMENT MODAL */}
      {showStatusModal && selectedRecordForStatus && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Route Document / Update Status</h2>
                <p className="text-xs font-mono text-gray-500 mt-0.5">
                  {selectedRecordForStatus.tracking_number}
                </p>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-gray-50/70 rounded-lg border border-gray-200/80 space-y-1 text-xs">
                <div className="font-medium text-gray-900">{selectedRecordForStatus.title}</div>
                <div className="text-gray-500">
                  Location: <span className="font-medium text-gray-800">{selectedRecordForStatus.current_location || selectedRecordForStatus.office}</span>
                </div>
                <div className="text-gray-400">
                  Origin: {selectedRecordForStatus.origin_office || selectedRecordForStatus.office}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Select Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType("Acknowledge")}
                    className={`p-2.5 text-left border rounded-lg transition-all cursor-pointer ${
                      actionType === "Acknowledge"
                        ? "bg-[#FF9501] text-white border-[#FF9501] shadow-2xs"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs font-semibold">Receive</div>
                    <div className={`text-[10px] mt-0.5 ${actionType === "Acknowledge" ? "text-orange-100" : "text-gray-500"}`}>Acknowledge on desk</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType("Forward")}
                    className={`p-2.5 text-left border rounded-lg transition-all cursor-pointer ${
                      actionType === "Forward"
                        ? "bg-[#FF9501] text-white border-[#FF9501] shadow-2xs"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs font-semibold">Forward</div>
                    <div className={`text-[10px] mt-0.5 ${actionType === "Forward" ? "text-orange-100" : "text-gray-500"}`}>Route to next office</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType("Return")}
                    className={`p-2.5 text-left border rounded-lg transition-all cursor-pointer ${
                      actionType === "Return"
                        ? "bg-[#FF9501] text-white border-[#FF9501] shadow-2xs"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs font-semibold">Return</div>
                    <div className={`text-[10px] mt-0.5 ${actionType === "Return" ? "text-orange-100" : "text-gray-500"}`}>Send back for revision</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType("Approve")}
                    className={`p-2.5 text-left border rounded-lg transition-all cursor-pointer ${
                      actionType === "Approve"
                        ? "bg-[#FF9501] text-white border-[#FF9501] shadow-2xs"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs font-semibold">Approve</div>
                    <div className={`text-[10px] mt-0.5 ${actionType === "Approve" ? "text-orange-100" : "text-gray-500"}`}>Approve & close trail</div>
                  </button>
                </div>
              </div>

              {actionType === "Forward" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Forward / Route to Office or Desk <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Registrar & MIS, Campus Director, Finance"
                    className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                    value={targetOffice}
                    onChange={(e) => setTargetOffice(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Action Remarks / Notes</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Acknowledged on desk for review."
                  className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] resize-none"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="flex-1 px-4 py-2 text-xs font-semibold bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] flex justify-center items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Complete Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* "REQUEST DOCUMENT" MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Request Document from Desk</h2>
                <p className="text-xs text-gray-500 mt-0.5">Issue a formal pull-request for documents required for compliance</p>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Requested Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2025-2026 Faculty Syllabi Submission"
                  className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                  value={requestFormData.title}
                  onChange={(e) => setRequestFormData({ ...requestFormData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer text-gray-800"
                    value={requestFormData.document_type}
                    onChange={(e) => setRequestFormData({ ...requestFormData, document_type: e.target.value })}
                  >
                    <option value="Syllabus">Syllabus</option>
                    <option value="Transmittal Sheet">Transmittal Sheet</option>
                    <option value="Grade Sheet">Grade Sheet</option>
                    <option value="Clearance Form">Clearance Form</option>
                    <option value="Accreditation Document">Accreditation Document</option>
                    <option value="MOA / MOU">MOA / MOU</option>
                    <option value="Administrative Report">Administrative Report</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Target Office or College to Provide <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer text-gray-800"
                    value={requestFormData.office}
                    onChange={(e) => setRequestFormData({ ...requestFormData, office: e.target.value })}
                  >
                    <optgroup label="Academic Colleges & Departments">
                      {CAMPUS_COLLEGES.map((col) => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Administrative & ISO Offices">
                      {ISO_OFFICES_16.map((off) => (
                        <option key={off} value={off}>{off}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Specific Recipient Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. faculty.member@ctu.edu.ph"
                  className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                  value={requestFormData.target_person_email}
                  onChange={(e) => setRequestFormData({ ...requestFormData, target_person_email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Instructions / Submission Purpose</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please submit your updated 2026 curriculum map."
                  className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] resize-none"
                  value={requestFormData.instructions}
                  onChange={(e) => setRequestFormData({ ...requestFormData, instructions: e.target.value })}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="flex-1 px-4 py-2 text-xs font-semibold bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] flex justify-center items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingRequest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Issue Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* "FULFILL REQUEST" MODAL */}
      {showFulfillModal && selectedRecordForFulfill && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Fulfill Document Request</h2>
                <p className="text-xs font-mono text-gray-500 mt-0.5">{selectedRecordForFulfill.tracking_number}</p>
              </div>
              <button onClick={() => setShowFulfillModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFulfillSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1 text-xs">
                <div className="font-medium text-gray-900">Requesting: {selectedRecordForFulfill.sender_name}</div>
                <div className="text-gray-500">Note: "{selectedRecordForFulfill.remarks || "No additional note."}"</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Attach Requested File <span className="text-red-500">*</span></label>
                <div
                  onClick={() => fulfillFileInputRef.current?.click()}
                  className="border border-dashed border-gray-300 hover:border-[#FF9501] bg-gray-50/50 hover:bg-orange-50/20 rounded-lg p-4 text-center cursor-pointer transition-colors"
                >
                  {fulfillFile ? (
                    <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-800">
                      <FileText className="h-3.5 w-3.5 text-[#FF9501]" />
                      <span>{fulfillFile.name}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Click to upload document copy</p>
                  )}
                  <input
                    type="file"
                    ref={fulfillFileInputRef}
                    className="hidden"
                    onChange={(e) => setFulfillFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fulfillment Remarks / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Attached is the requested updated syllabus."
                  className="w-full px-3.5 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] resize-none"
                  value={fulfillRemarks}
                  onChange={(e) => setFulfillRemarks(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowFulfillModal(false)}
                  className="flex-1 px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFulfill}
                  className="flex-1 px-4 py-2 text-xs font-semibold bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] flex justify-center items-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingFulfill ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Upload & Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TIMELINE / HISTORY MODAL */}
      {showTimelineModal && selectedRecordForTimeline && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl overflow-hidden max-h-[88vh] flex flex-col border border-gray-200 animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Document Routing History</h2>
                <p className="text-xs font-mono text-gray-500 mt-0.5">
                  {selectedRecordForTimeline.tracking_number} - {selectedRecordForTimeline.title}
                </p>
              </div>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Routing Summary Banner */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2 text-xs">
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Movement Flow</div>
                <div className="flex items-center flex-wrap gap-2 text-xs font-medium text-gray-900">
                  <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-md">
                    Origin: {selectedRecordForTimeline.origin_office || selectedRecordForTimeline.office}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                  <span className="px-2.5 py-1 bg-white border border-gray-200 rounded-md">
                    Current: {selectedRecordForTimeline.current_location || selectedRecordForTimeline.office}
                  </span>
                  {selectedRecordForTimeline.status === "Approved" && (
                    <>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                        Closed
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Timeline Logs Tree */}
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {selectedRecordForTimeline.logs && selectedRecordForTimeline.logs.length > 0 ? (
                  selectedRecordForTimeline.logs.map((log, idx) => {
                    const logBadge = getStatusBadge(log.status);
                    return (
                      <div key={log.id || idx} className="relative flex items-start gap-3">
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-gray-400 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                        </div>

                        <div className="flex-1 bg-gray-50/60 p-3.5 rounded-lg border border-gray-200 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-xs text-gray-900">Step #{selectedRecordForTimeline.logs.length - idx}: {log.action}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${logBadge.bg}`}>
                              {log.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-gray-500 flex items-center gap-2">
                            <span>Actor: <strong className="text-gray-700">{log.actor_name}</strong> ({log.actor_role})</span>
                            <span>•</span>
                            <span>{new Date(log.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</span>
                          </div>

                          {log.notes && (
                            <p className="text-xs text-gray-700 pt-1 bg-white p-2 rounded border border-gray-200">
                              "{log.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-gray-500">No history logs recorded yet.</p>
                )}
              </div>
            </div>

            <div className="p-3.5 border-t border-gray-200 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setShowTimelineModal(false)}
                className="px-4 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE TRANSMITTAL RECEIPT MODAL */}
      {showReceiptModal && selectedRecordForReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-[#E5E7EB] flex justify-between items-center bg-[#F9FAFB] print:hidden">
              <span className="text-sm font-semibold text-[#1F2937]">Official Transmittal Slip Preview</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReceipt}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF9501] text-white text-xs font-semibold rounded-lg hover:bg-[#D97E00] shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" /> Print Receipt
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-1 hover:bg-[#E5E7EB] rounded-full text-[#6B7280]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Area */}
            <div className="p-8 overflow-y-auto space-y-6 print:p-0">
              <div className="border-2 border-[#1F2937] p-6 rounded-lg space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-gray-200 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#1F2937]">CEBU TECHNOLOGICAL UNIVERSITY</h2>
                    <p className="text-xs font-semibold text-gray-600">ARGAO CAMPUS — KNOWLEDGE MANAGEMENT SYSTEM</p>
                    <p className="text-[11px] text-gray-500 mt-1">Official Document Transmittal & Paper Trail Receipt</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block p-2 bg-gray-100 rounded border border-gray-300 text-center font-mono">
                      <QrCode className="h-8 w-8 mx-auto text-gray-800" />
                      <span className="text-[10px] font-bold block mt-1">{selectedRecordForReceipt.tracking_number}</span>
                    </div>
                  </div>
                </div>

                {/* Details Table */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500 block">Tracking Number:</span>
                    <strong className="font-mono text-sm text-[#1F2937]">{selectedRecordForReceipt.tracking_number}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Date Released:</span>
                    <strong className="text-[#1F2937]">{new Date(selectedRecordForReceipt.created_at).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Document Title:</span>
                    <strong className="text-[#1F2937]">{selectedRecordForReceipt.title}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Document Type:</span>
                    <strong className="text-[#1F2937]">{selectedRecordForReceipt.document_type}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Released By (Sender):</span>
                    <strong className="text-[#1F2937]">{selectedRecordForReceipt.sender_name} ({selectedRecordForReceipt.sender_role})</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Destination Office:</span>
                    <strong className="text-[#1F2937]">{selectedRecordForReceipt.office}</strong>
                  </div>
                </div>

                {/* Status Box */}
                <div className="p-3 bg-gray-50 rounded border border-gray-200 flex justify-between items-center text-xs">
                  <span>Current Paper Trail Status:</span>
                  <span className="font-bold text-[#FF9501] uppercase tracking-wider">{selectedRecordForReceipt.status}</span>
                </div>

                {/* Signatures Line */}
                <div className="pt-12 grid grid-cols-2 gap-12 text-xs text-center border-t border-gray-200">
                  <div>
                    <div className="border-b border-gray-400 mb-1 pb-1 font-semibold">{selectedRecordForReceipt.sender_name}</div>
                    <span className="text-gray-500 text-[11px]">Releasing Officer / Faculty Signature</span>
                  </div>
                  <div>
                    <div className="border-b border-gray-400 mb-1 pb-1 font-semibold">
                      {selectedRecordForReceipt.recipient_name || "Receiving Office Staff"}
                    </div>
                    <span className="text-gray-500 text-[11px]">Receiving Office Signature & Date</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
