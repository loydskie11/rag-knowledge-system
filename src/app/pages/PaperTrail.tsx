import { useState, useEffect, useRef } from "react";
import {
  Search, Filter, Plus, FileCheck, Clock, CheckCircle2, AlertCircle,
  FileText, Send, Building, User, Download, Printer, X, Loader2,
  ChevronRight, Eye, History, QrCode, Tag, MessageSquare, ExternalLink,
  Inbox, Globe, MapPin, Flag
} from "lucide-react";
import axios from "axios";
import { useRole } from "../contexts/RoleContext";

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
        return { label: "Approved & Closed", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 };
      case "Needs Revision":
        return { label: "Needs Revision", bg: "bg-rose-50 text-rose-700 border-rose-200", icon: AlertCircle };
      case "Received":
        return { label: "Received at Office", bg: "bg-blue-50 text-blue-700 border-blue-200", icon: FileCheck };
      case "Forwarded":
        return { label: "Forwarded / In Transit", bg: "bg-purple-50 text-purple-700 border-purple-200", icon: Send };
      case "Under Review":
        return { label: "Under Review", bg: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock };
      case "Released":
        return { label: "Released / Transmitted", bg: "bg-purple-50 text-purple-700 border-purple-200", icon: Send };
      default:
        return { label: "Pending Receiving", bg: "bg-orange-50 text-[#D97E00] border-[#FF9501]/30", icon: Clock };
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
            <h1 className="text-2xl font-semibold text-[#1F2937]">Document Tracking System (DTS)</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              Multi-way office routing engine & physical / digital document location tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1D6FA3] text-white rounded-lg hover:bg-[#15527B] transition-all cursor-pointer shadow-sm active:scale-95 text-sm font-semibold"
            >
              <Send className="h-4 w-4" />
              <span>+ Request Document</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] transition-all cursor-pointer shadow-sm active:scale-95 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Route New Document</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Tracked */}
          <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] border-t-4 border-t-[#1D6FA3] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Total Tracked</p>
              <h3 className="text-2xl font-bold text-[#1F2937] mt-1">{totalTracked}</h3>
              <p className="text-[11px] text-[#6B7280] mt-0.5">Documents in paper trail</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#1D6FA3]">
              <FileText className="h-6 w-6" />
            </div>
          </div>

          {/* Pending Receiving */}
          <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] border-t-4 border-t-[#FF9501] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Pending Receiving</p>
              <h3 className="text-2xl font-bold text-[#D97E00] mt-1">{pendingReceiving}</h3>
              <p className="text-[11px] text-[#6B7280] mt-0.5">Awaiting office receipt</p>
            </div>
            <div className="w-12 h-12 bg-[#FFF4E5] rounded-xl flex items-center justify-center text-[#FF9501]">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          {/* Verified / Approved */}
          <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] border-t-4 border-t-emerald-500 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Verified / Approved</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{approvedCount}</h3>
              <p className="text-[11px] text-emerald-700 mt-0.5">Verified & paper okay</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>

          {/* Needs Revision */}
          <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] border-t-4 border-t-rose-500 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Needs Revision</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{needsRevisionCount}</h3>
              <p className="text-[11px] text-rose-700 mt-0.5">Returned to sender</p>
            </div>
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Phase 4: Action Board Tab Switcher (Inbox vs Outbox vs Campus All) */}
        <div className="flex border-b border-gray-200 gap-2 pt-2">
          <button
            onClick={() => setActionBoardTab("all")}
            className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              actionBoardTab === "all"
                ? "border-emerald-600 text-emerald-600 bg-emerald-50/50 rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Globe className="h-4 w-4" /> All Campus Documents
          </button>

          <button
            onClick={() => setActionBoardTab("inbox")}
            className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              actionBoardTab === "inbox"
                ? "border-[#FF9501] text-[#FF9501] bg-orange-50/50 rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Inbox className="h-4 w-4" /> Action Board Inbox
          </button>

          <button
            onClick={() => setActionBoardTab("outbox")}
            className={`px-5 py-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              actionBoardTab === "outbox"
                ? "border-[#1D6FA3] text-[#1D6FA3] bg-blue-50/50 rounded-t-lg"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Send className="h-4 w-4" /> Action Board Outbox 
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
                className="w-full sm:w-44 px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] text-[#374151] cursor-pointer"
                value={selectedOffice}
                onChange={(e) => setSelectedOffice(e.target.value)}
              >
                <option value="all">All Offices</option>
                <option value="Academic Affairs">Academic Affairs</option>
                <option value="Student Affairs">Student Affairs</option>
                <option value="Dean's Office">Dean's Office</option>
                <option value="Registrar Office">Registrar Office</option>
                <option value="Research Office">Research Office</option>
                <option value="Quality Assurance">Quality Assurance</option>
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
      <div className="flex-1 bg-white rounded-xl border border-[#E5E7EB] shadow-sm flex flex-col overflow-hidden min-h-[300px]">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-[#6B7280]">
            <Loader2 className="h-8 w-8 animate-spin text-[#FF9501] mb-3" />
            <p className="text-sm font-medium">Loading paper trail records...</p>
          </div>
        ) : actionBoardRecords.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-[#6B7280] text-center">
            <FileCheck className="h-12 w-12 text-[#9CA3AF] mb-3 stroke-[1.5]" />
            <h3 className="text-base font-semibold text-[#1F2937]">No Paper Trail Records Found</h3>
            <p className="text-sm text-[#6B7280] mt-1 max-w-md">
              There are no document movement logs matching your search or filter. Release a new document to start tracking!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-[#FF9501] text-white text-xs font-semibold rounded-lg hover:bg-[#D97E00] transition-colors"
            >
              Release Document
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full whitespace-nowrap text-left border-collapse">
              <thead className="bg-[#FF9501] text-white sticky top-0 z-20 shadow-md">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider">Tracking #</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider">Document Title & Type</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider">Current Location & Origin</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider">Status & Type</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider">Actions</th>
                  <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-right">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {actionBoardRecords.map((rec) => {
                  const badge = getStatusBadge(rec.status);
                  const BadgeIcon = badge.icon;
                  const isPendingMyFulfillment = rec.status === "Pending Request" && (rec.recipient_email === userEmail || rec.office.toLowerCase().includes((sessionStorage.getItem("userDepartment") || "").toLowerCase()));
                  return (
                    <tr key={rec.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-[#FF9501]" />
                          <span className="font-mono font-bold text-xs text-[#1F2937]">{rec.tracking_number}</span>
                        </div>
                        <div className="mt-1">
                          <span className={`px-2 py-0.5 font-bold rounded text-[9px] uppercase tracking-wider border ${
                            rec.transaction_type === "Request" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {rec.transaction_type || "Submission"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-sm text-[#1F2937] truncate max-w-xs" title={rec.title}>
                          {rec.title}
                        </div>
                        <div className="text-xs text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                            {rec.document_type}
                          </span>
                          {rec.file_url && (
                            <a
                              href={rec.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#FF9501] hover:underline flex items-center gap-0.5 text-[11px]"
                            >
                              <ExternalLink className="h-3 w-3" /> File Attachment
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-[#1F2937] flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[#FF9501]" />
                          <span>Location: {rec.current_location || rec.office}</span>
                        </div>
                        <div className="text-[11px] text-[#6B7280] pl-5 mt-0.5">
                          Origin: {rec.origin_office || rec.office} ({rec.origin_person || rec.sender_name})
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border ${badge.bg}`}>
                          <BadgeIcon className="h-3.5 w-3.5" />
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions Column (Placed before Last Updated so it's easily accessible) */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Timeline / History */}
                          <button
                            onClick={() => {
                              setSelectedRecordForTimeline(rec);
                              setShowTimelineModal(true);
                            }}
                            className="p-1.5 text-[#6B7280] hover:text-[#FF9501] hover:bg-[#FFF4E5] rounded-lg transition-colors cursor-pointer"
                            title="View Routing History"
                          >
                            <History className="h-4 w-4" />
                          </button>

                          {/* Print Receipt */}
                          <button
                            onClick={() => {
                              setSelectedRecordForReceipt(rec);
                              setShowReceiptModal(true);
                            }}
                            className="p-1.5 text-[#6B7280] hover:text-[#FF9501] hover:bg-[#FFF4E5] rounded-lg transition-colors cursor-pointer"
                            title="Print Transmittal Receipt"
                          >
                            <Printer className="h-4 w-4" />
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
                              className="px-3 py-1 text-xs font-extrabold bg-[#1D6FA3] text-white hover:bg-[#15527B] rounded-md transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1"
                              title="Fulfill Pending Document Request"
                            >
                              <Upload className="h-3.5 w-3.5" /> Fulfill Request
                            </button>
                          ) : (
                            /* Take Action */
                            <button
                              onClick={() => {
                                setSelectedRecordForStatus(rec);
                                setActionType("Acknowledge");
                                setTargetOffice("");
                                setStatusNotes("");
                                setShowStatusModal(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-[#FFF4E5] text-[#D97E00] hover:bg-[#FF9501] hover:text-white border border-[#FF9501]/30 rounded-md transition-all cursor-pointer shadow-sm active:scale-95"
                              title="Take Routing Action"
                            >
                              Take Action
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Last Updated Column (On the far right) */}
                      <td className="px-6 py-4 text-xs text-[#6B7280] text-right">
                        {new Date(rec.updated_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border-t-4 border-t-[#FF9501] max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-xl font-semibold text-[#1F2937]">Release / Submit Document</h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Generate a tracking entry for official receiving & releasing
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-[#E5E7EB] rounded-full transition-colors cursor-pointer text-[#6B7280]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BSIT Course Syllabus for CS46 - SY 2026-2027"
                  className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">Document Type</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer"
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
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">Target Office / Destination</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer"
                    value={formData.office}
                    onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                  >
                    <option value="Academic Affairs">Academic Affairs</option>
                    <option value="Student Affairs">Student Affairs</option>
                    <option value="Dean's Office">Dean's Office</option>
                    <option value="Registrar Office">Registrar Office</option>
                    <option value="Research Office">Research Office</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">Recipient Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Maria Santos"
                    className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">Recipient Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="recipient@ctu.edu.ph"
                    className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                    value={formData.recipient_email}
                    onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">Initial Remarks / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Submitted for Dean's signature and verification."
                  className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] resize-none"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">Attach Digital Copy (Optional)</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#E5E7EB] hover:border-[#FF9501] bg-[#F9FAFB] hover:bg-[#FFF4E5]/40 rounded-lg p-4 text-center cursor-pointer transition-colors"
                >
                  {attachedFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#FF9501]">
                      <FileText className="h-4 w-4" />
                      <span>{attachedFile.name}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6B7280]">Click to attach PDF, Word, or image copy of the document</p>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-[#4B5563] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] transition-colors flex justify-center items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Release & Create Tracking
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAKE ACTION & ROUTE DOCUMENT MODAL (Phase 2 Workflow) */}
      {showStatusModal && selectedRecordForStatus && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border-t-4 border-t-[#FF9501] max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-[#E5E7EB] flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-lg font-semibold text-[#1F2937]">Take Action / Route Document</h2>
                <p className="text-xs font-mono font-bold text-[#FF9501] mt-0.5">
                  {selectedRecordForStatus.tracking_number}
                </p>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1.5 hover:bg-[#E5E7EB] rounded-full transition-colors cursor-pointer text-[#6B7280]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] space-y-1">
                <div className="text-xs font-bold text-[#1F2937]">{selectedRecordForStatus.title}</div>
                <div className="text-[11px] text-[#6B7280]">
                  📍 Current Location: <span className="font-bold text-[#1F2937]">{selectedRecordForStatus.current_location || selectedRecordForStatus.office}</span>
                </div>
                <div className="text-[11px] text-[#6B7280]">
                  Origin: {selectedRecordForStatus.origin_office || selectedRecordForStatus.office} ({selectedRecordForStatus.origin_person || selectedRecordForStatus.sender_name})
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">Select Routing Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType("Acknowledge")}
                    className={`p-3 text-left border rounded-xl transition-all cursor-pointer ${
                      actionType === "Acknowledge"
                        ? "bg-[#FFF4E5] border-[#FF9501] ring-2 ring-[#FF9501]/30"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <FileCheck className="h-3.5 w-3.5 text-[#FF9501]" /> Receive
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Acknowledge on desk</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType("Forward")}
                    className={`p-3 text-left border rounded-xl transition-all cursor-pointer ${
                      actionType === "Forward"
                        ? "bg-purple-50 border-purple-500 ring-2 ring-purple-500/30"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-purple-600" /> Forward
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Route to next office</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType("Return")}
                    className={`p-3 text-left border rounded-xl transition-all cursor-pointer ${
                      actionType === "Return"
                        ? "bg-rose-50 border-rose-500 ring-2 ring-rose-500/30"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600" /> Return
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Send back for revision</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType("Approve")}
                    className={`p-3 text-left border rounded-xl transition-all cursor-pointer ${
                      actionType === "Approve"
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30"
                        : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Approve
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Approve & Close trail</div>
                  </button>
                </div>
              </div>

              {actionType === "Forward" && (
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">Forward / Route to Office or Desk <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Registrar & MIS, Desk of Campus Director, Finance"
                    className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
                    value={targetOffice}
                    onChange={(e) => setTargetOffice(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">Movement Notes / Action Remarks</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Acknowledged on desk for review. Routed to Campus Director for signature."
                  className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9501] resize-none"
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold text-[#4B5563] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] flex justify-center items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Action & Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* "REQUEST DOCUMENT" MODAL (Phase 3 - Available to Faculty & Admins) */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border-t-4 border-t-[#1D6FA3] max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-[#E5E7EB] flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-lg font-bold text-[#1F2937] flex items-center gap-2">
                  <Send className="h-5 w-5 text-[#1D6FA3]" /> Issue Document Request (Memo, Resolution, Map, etc.)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Request official documents (Memos, Board Resolutions, Syllabi) from campus offices or personnel</p>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="p-1.5 hover:bg-[#E5E7EB] rounded-full text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1F2937] mb-1">Document Title Requested <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Memorandum on Midterm Clearance, Board Resolution No. 42"
                  className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA3]"
                  value={requestFormData.title}
                  onChange={(e) => setRequestFormData({ ...requestFormData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1F2937] mb-1">Document Type</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA3]"
                    value={requestFormData.document_type}
                    onChange={(e) => setRequestFormData({ ...requestFormData, document_type: e.target.value })}
                  >
                    <option value="Memo">Memorandum (Memo)</option>
                    <option value="Resolution">Board / Office Resolution</option>
                    <option value="Curriculum Map">Curriculum Map</option>
                    <option value="Syllabus">Syllabus</option>
                    <option value="Grade Sheet">Grade Sheet</option>
                    <option value="Clearance Form">Clearance Form</option>
                    <option value="Accreditation Document">Accreditation Document</option>
                    <option value="Administrative Report">Administrative Report</option>
                    <option value="Other">Other Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1F2937] mb-1">Target Office <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dean's Office, HRMO, Registrar, Academic Affairs"
                    className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA3]"
                    value={requestFormData.office}
                    onChange={(e) => setRequestFormData({ ...requestFormData, office: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2937] mb-1">Target Contact Person (Optional)</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Person Name (e.g. Dr. Jane Smith)"
                    className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA3]"
                    value={requestFormData.target_person_name}
                    onChange={(e) => setRequestFormData({ ...requestFormData, target_person_name: e.target.value })}
                  />
                  <input
                    type="email"
                    placeholder="Contact Email (e.g. jane@ctu.edu.ph)"
                    className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA3]"
                    value={requestFormData.target_person_email}
                    onChange={(e) => setRequestFormData({ ...requestFormData, target_person_email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2937] mb-1">Instructions / Specific Note</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please submit your updated 2026 curriculum map approved by Dean."
                  className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA3] resize-none"
                  value={requestFormData.instructions}
                  onChange={(e) => setRequestFormData({ ...requestFormData, instructions: e.target.value })}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="flex-1 px-4 py-2.5 text-xs font-bold bg-[#1D6FA3] text-white rounded-lg hover:bg-[#15527B] flex justify-center items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : "Issue Request & Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* "FULFILL REQUEST" MODAL (Phase 3) */}
      {showFulfillModal && selectedRecordForFulfill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border-t-4 border-t-[#1D6FA3] max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-[#E5E7EB] flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-lg font-bold text-[#1F2937] flex items-center gap-2">
                  <Upload className="h-5 w-5 text-[#1D6FA3]" /> Fulfill Document Request
                </h2>
                <p className="text-xs font-mono font-bold text-[#FF9501] mt-0.5">
                  {selectedRecordForFulfill.tracking_number} - {selectedRecordForFulfill.title}
                </p>
              </div>
              <button onClick={() => setShowFulfillModal(false)} className="p-1.5 hover:bg-[#E5E7EB] rounded-full text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFulfillSubmit} className="p-5 space-y-4">
              <div className="p-3 bg.blue-50/50 border border-blue-200 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-[#1D6FA3]">Requesting Director / Admin: {selectedRecordForFulfill.sender_name}</div>
                <div className="text-gray-600">Note: "{selectedRecordForFulfill.remarks || "No additional note."}"</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2937] mb-1">Attach Requested Document File <span className="text-red-500">*</span></label>
                <div
                  onClick={() => fulfillFileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#E5E7EB] hover:border-[#1D6FA3] bg-[#F9FAFB] hover:bg-blue-50/30 rounded-xl p-5 text-center cursor-pointer transition-colors"
                >
                  {fulfillFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm font-bold text-[#1D6FA3]">
                      <FileText className="h-4 w-4" />
                      <span>{fulfillFile.name}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 font-semibold">Click to upload PDF, Word, or Spreadsheet document copy</p>
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
                <label className="block text-xs font-bold text-[#1F2937] mb-1">Fulfillment Remarks / Note to Director</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Attached is the requested updated curriculum map 2026."
                  className="w-full px-3.5 py-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6FA3] resize-none"
                  value={fulfillRemarks}
                  onChange={(e) => setFulfillRemarks(e.target.value)}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowFulfillModal(false)}
                  className="flex-1 px-4 py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFulfill}
                  className="flex-1 px-4 py-2.5 text-xs font-bold bg-[#1D6FA3] text-white rounded-lg hover:bg-[#15527B] flex justify-center items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmittingFulfill ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload File & Route Back"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TIMELINE / HISTORY MODAL WITH VISUAL ROUTING HOPS PIPELINE (Phase 4) */}
      {showTimelineModal && selectedRecordForTimeline && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden max-h-[88vh] flex flex-col animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-[#E5E7EB] flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-lg font-bold text-[#1F2937]">Physical Document Routing Hops Pipeline</h2>
                <p className="text-xs font-mono font-bold text-[#FF9501] mt-0.5">
                  {selectedRecordForTimeline.tracking_number} - {selectedRecordForTimeline.title}
                </p>
              </div>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="p-1.5 hover:bg-[#E5E7EB] rounded-full transition-colors cursor-pointer text-[#6B7280]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Visual Routing Hops Header Banner */}
              <div className="p-4 bg-gradient-to-r from-orange-50 via-purple-50 to-blue-50 border border-gray-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Physical Movement Hops Pipeline</div>
                <div className="flex items-center flex-wrap gap-2 text-xs font-extrabold text-gray-900">
                  <span className="px-3 py-1 bg-white border border-gray-300 rounded-lg shadow-2xs flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 text-[#1D6FA3]" /> Origin: {selectedRecordForTimeline.origin_office || selectedRecordForTimeline.office}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <span className="px-3 py-1 bg-[#FFF4E5] border border-[#FF9501]/40 text-[#D97E00] rounded-lg shadow-2xs flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#FF9501]" /> Current Location: {selectedRecordForTimeline.current_location || selectedRecordForTimeline.office}
                  </span>
                  {selectedRecordForTimeline.status === "Approved" && (
                    <>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                      <span className="px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg shadow-2xs flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Approved & Closed
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Timeline Logs Tree */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB]">
                {selectedRecordForTimeline.logs && selectedRecordForTimeline.logs.length > 0 ? (
                  selectedRecordForTimeline.logs.map((log, idx) => {
                    const logBadge = getStatusBadge(log.status);
                    return (
                      <div key={log.id || idx} className="relative flex items-start gap-4">
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-[#FF9501] flex items-center justify-center shadow-2xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF9501]" />
                        </div>

                        <div className="flex-1 bg-[#F9FAFB] p-4 rounded-xl border border-[#E5E7EB] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[#1F2937]">Hop #{selectedRecordForTimeline.logs.length - idx}: {log.action}</span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${logBadge.bg}`}>
                              {log.status}
                            </span>
                          </div>

                          <div className="text-xs text-[#6B7280] flex items-center gap-2">
                            <span>Actor: <strong>{log.actor_name}</strong> ({log.actor_role})</span>
                            <span>•</span>
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>

                          {log.notes && (
                            <p className="text-xs text-[#374151] pt-1 bg-white p-2.5 rounded-lg border border-[#E5E7EB] italic">
                              "{log.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-[#6B7280]">No history logs recorded yet.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex justify-end">
              <button
                onClick={() => setShowTimelineModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#4B5563] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6]"
              >
                Close Routing History
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
