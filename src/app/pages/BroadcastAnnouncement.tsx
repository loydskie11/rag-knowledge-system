import { useState, useEffect } from "react";
import { Send, Users, Calendar, CheckCircle, Clock, Eye, Loader2, Save, Radio, Search, Filter, X, Trash2, BarChart3, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import axios from "axios";

interface Announcement {
  id: string;
  title: string;
  content: string;
  recipients: string;
  sent_date: string;
  schedule_date: string | null;
  sent_by: string;
  status: "Sent" | "Scheduled" | "Draft";
  read_count: number;
  total_recipients: number;
}

export function BroadcastAnnouncement() {
  // UI States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form States
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Real-time Database Counts
  const [userCounts, setUserCounts] = useState({ all: 0, students: 0, faculty: 0 });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Sent" | "Scheduled" | "Draft">("All");

  // Modals
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const userEmail = sessionStorage.getItem("userEmail") || "admin@ctu.edu.ph";

  const recipientOptions = [
    { value: "All Users", label: "All Users", count: userCounts.all },
    { value: "All Students", label: "All Students", count: userCounts.students },
    { value: "All Faculty", label: "All Faculty", count: userCounts.faculty },
  ];

  useEffect(() => {
    fetchAnnouncements();
    fetchUserCounts();
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000); 
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get("http://localhost:8000/announcements");
      setAnnouncements(response.data);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchUserCounts = async () => {
    try {
      const response = await axios.get("http://localhost:8000/users/counts");
      setUserCounts(response.data);
    } catch (error) {
      console.error("Failed to fetch user counts:", error);
    }
  };

  // --- Live Count Helper for Analytics ---
  const getLiveTargetCount = (recipientsString: string) => {
    if (!recipientsString) return userCounts.all || 1;
    if (recipientsString.includes("All Users")) return userCounts.all || 1;
    
    let liveTotal = 0;
    if (recipientsString.includes("All Students")) liveTotal += userCounts.students;
    if (recipientsString.includes("All Faculty")) liveTotal += userCounts.faculty;
    return liveTotal > 0 ? liveTotal : (userCounts.all || 1);
  };

  const calculateTotalTargets = (selections: string[]) => {
    if (!selections || selections.length === 0) return userCounts.all || 1;
    if (selections.includes("All Users")) return userCounts.all || 1;
    
    let totalTargets = 0;
    if (selections.includes("All Students")) totalTargets += userCounts.students;
    if (selections.includes("All Faculty")) totalTargets += userCounts.faculty;
    return totalTargets > 0 ? totalTargets : (userCounts.all || 1);
  };

  const handleRecipientToggle = (value: string, currentSelections: string[], setFunction: (val: string[]) => void) => {
    setFunction(
      (() => {
        if (value === "All Users") return ["All Users"];
        const newSelection = currentSelections.filter(r => r !== "All Users");
        return currentSelections.includes(value) 
          ? newSelection.filter(r => r !== value) 
          : [...newSelection, value];
      })()
    );
  };

  // Maps recipient label to the backend's target_role format
  const getTargetRole = (recipients: string[]): string => {
    if (recipients.includes("All Users")) return "ALL";
    if (recipients.includes("All Faculty") && recipients.includes("All Students")) return "ALL";
    if (recipients.includes("All Faculty")) return "FACULTY";
    if (recipients.includes("All Students")) return "STUDENT";
    return "ALL";
  };

  const handleSendAnnouncement = async (statusOverride: "Sent" | "Scheduled" | "Draft" = "Sent") => {
    if (!title || !content || selectedRecipients.length === 0) {
      showToast("Please fill in all required fields and select a recipient.", "error");
      return;
    }
    setIsLoading(true);
    const isSending = statusOverride === "Sent" && !scheduleDate;
    const payload = {
      title,
      content,
      recipients: selectedRecipients.join(", "),
      schedule_date: scheduleDate || null,
      status: statusOverride === "Draft" ? "Draft" : (scheduleDate ? "Scheduled" : "Sent"),
      sent_by: userEmail,
      total_recipients: calculateTotalTargets(selectedRecipients)
    };

    try {
      await axios.post("http://localhost:8000/announcements", payload);

      // Send live notifications to users only when broadcasting immediately
      if (isSending) {
        await axios.post("http://localhost:8000/admin/broadcast", {
          title,
          message: content,
          target_role: getTargetRole(selectedRecipients),
          sender_email: userEmail,
        });
      }

      setTitle(""); setContent(""); setSelectedRecipients([]); setScheduleDate("");
      setIsCreateOpen(false);
      showToast(`Broadcast successfully ${statusOverride === 'Sent' ? 'sent' : 'saved'}!`, "success");
      fetchAnnouncements();
    } catch (error) {
      showToast("Failed to create broadcast. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateAnnouncement = async (id: string, action: "Save" | "Send Now") => {
    if (!editingAnnouncement) return;
    if (!editingAnnouncement.title || !editingAnnouncement.content || editingAnnouncement.recipients.length === 0) {
      showToast("Fields cannot be empty.", "error"); return;
    }

    setIsModalLoading(true);
    const isSendingNow = action === "Send Now";
    
    const payload = {
      title: editingAnnouncement.title,
      content: editingAnnouncement.content,
      recipients: editingAnnouncement.recipients,
      schedule_date: isSendingNow ? null : (editingAnnouncement.schedule_date || null),
      status: isSendingNow ? "Sent" : editingAnnouncement.status,
      total_recipients: calculateTotalTargets(editingAnnouncement.recipients.split(", "))
    };

    try {
      await axios.put(`http://localhost:8000/announcements/${id}`, payload);

      // Send live notifications when sending a draft/scheduled announcement now
      if (isSendingNow) {
        await axios.post("http://localhost:8000/admin/broadcast", {
          title: editingAnnouncement.title,
          message: editingAnnouncement.content,
          target_role: getTargetRole(editingAnnouncement.recipients.split(", ")),
          sender_email: userEmail,
        });
      }

      setEditingAnnouncement(null);
      showToast(isSendingNow ? "Broadcast sent successfully!" : "Draft updated.", "success");
      fetchAnnouncements();
    } catch (error) {
      showToast("Failed to update announcement.", "error");
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement? This cannot be undone.")) return;
    setIsModalLoading(true);
    try {
      await axios.delete(`http://localhost:8000/announcements/${id}`);
      setEditingAnnouncement(null);
      showToast("Announcement deleted.", "success");
      fetchAnnouncements();
    } catch (error) {
      showToast("Failed to delete announcement.", "error");
    } finally {
      setIsModalLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesStatus = statusFilter === "All" || a.status === statusFilter;
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate Dynamic Stats
  const totalSent = announcements.filter(a => a.status === "Sent").length;
  const totalScheduled = announcements.filter(a => a.status === "Scheduled").length;
  let globalReadCount = 0; 
  let globalTotalRecipients = 0;
  
  announcements.filter(a => a.status === "Sent").forEach(a => { 
    globalReadCount += a.read_count; 
    // Force live count for the global stat calculation too!
    globalTotalRecipients += getLiveTargetCount(a.recipients); 
  });
  
  const avgReadRate = globalTotalRecipients === 0 ? 0 : Math.round((globalReadCount / globalTotalRecipients) * 100);

  return (
    <div className="space-y-6 relative pb-10">
      
      {/* GLOBAL TOAST NOTIFICATION */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl animate-in slide-in-from-bottom-5 fade-in duration-300 ${
          toast.type === "success" ? "bg-gray-900 text-white" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {toast.type === "success" ? <CheckCircle className="h-5 w-5 text-green-400" /> : <AlertCircle className="h-5 w-5" />}
          <span className="font-medium text-sm">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 transition-opacity cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Broadcast Announcements</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Send and manage institutional announcements to students and faculty.</p>
        </div>
      </div>

      {/* STATISTICS METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Broadcasts</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-bold text-gray-900">{totalSent}</h3>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">Sent</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Scheduled</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-bold text-gray-900">{totalScheduled}</h3>
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">Pending</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Avg. Read Rate</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-bold text-gray-900">{avgReadRate}%</h3>
            <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">Engagement</span>
          </div>
        </div>
      </div>

      {/* --- COLLAPSIBLE CREATE FORM --- */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden transition-all duration-300">
        <button
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="w-full flex items-center justify-between p-4 sm:p-5 bg-white hover:bg-gray-50/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCreateOpen ? "bg-[#FF9501] text-white" : "bg-orange-50 text-[#FF9501]"}`}>
              <Radio className="h-4 w-4" />
            </div>
            <div className="text-left">
              <h2 className="text-sm sm:text-base font-semibold text-gray-900">Create New Broadcast</h2>
              <p className="text-xs text-gray-500">Draft or send a new institutional announcement</p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
            {isCreateOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {isCreateOpen && (
          <div className="p-5 sm:p-6 border-t border-gray-200 bg-gray-50/30 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-700">Announcement Title *</label>
                <input
                  type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] transition-all"
                  placeholder="Enter announcement title"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-700">Message Content *</label>
                <textarea
                  value={content} onChange={(e) => setContent(e.target.value)} rows={4}
                  className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] transition-all resize-none"
                  placeholder="Type your announcement message here..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-700">Select Recipients *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recipientOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleRecipientToggle(option.value, selectedRecipients, setSelectedRecipients)}
                      className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                        selectedRecipients.includes(option.value) 
                          ? "border-[#FF9501] bg-orange-50/40 text-gray-900" 
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Users className={`h-4 w-4 ${selectedRecipients.includes(option.value) ? "text-[#FF9501]" : "text-gray-400"}`} />
                        <h3 className="text-xs font-semibold text-gray-900">{option.label}</h3>
                      </div>
                      <p className="text-[11px] text-gray-500">{option.count} recipients</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-700">Schedule Delivery (Optional)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full sm:w-72 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] transition-all cursor-pointer"
                  />
                  <span className="text-[11px] text-gray-400">Leave empty to send immediately</span>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => handleSendAnnouncement("Sent")} disabled={isLoading}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] transition-colors text-xs font-semibold disabled:opacity-50 cursor-pointer shadow-2xs active:scale-95"
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {scheduleDate ? "Schedule Announcement" : "Send Broadcast Now"}
                </button>
                <button 
                  onClick={() => handleSendAnnouncement("Draft")} disabled={isLoading}
                  className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5 text-gray-500" /> Save as Draft
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PREVIOUS ANNOUNCEMENTS LIST */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-sm sm:text-base font-semibold text-gray-900">Announcement History</h2>
          
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text" placeholder="Search broadcasts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501]"
              />
            </div>
            <div className="relative w-full sm:w-auto">
              <select
                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full sm:w-auto px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Sent">Sent</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Draft">Drafts</option>
              </select>
            </div>
          </div>
        </div>
        
        {isFetching ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[#FF9501]" /></div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="text-center py-10 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 text-xs">
            No announcements found.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnouncements.map((announcement) => (
              <div 
                key={announcement.id} 
                onClick={() => {
                  if (announcement.status === "Sent") setViewingAnnouncement(announcement);
                  else setEditingAnnouncement(announcement);
                }}
                className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-2xs transition-all bg-white cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-gray-900 font-semibold text-xs sm:text-sm truncate">{announcement.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider shrink-0 ${
                        announcement.status === "Sent" ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        : announcement.status === "Scheduled" ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                        : "bg-gray-100 text-gray-600 border border-gray-200"
                      }`}>
                        {announcement.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs line-clamp-2 mb-2">{announcement.content}</p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400">
                      <span>{announcement.recipients}</span>
                      <span>•</span>
                      <span>{formatDate(announcement.sent_date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Edit Draft / Scheduled */}
      {editingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/50">
              <h3 className="font-semibold text-xs text-gray-900">Edit {editingAnnouncement.status}</h3>
              <button onClick={() => setEditingAnnouncement(null)} className="text-gray-400 hover:text-gray-900 p-1 cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            
            <div className="p-5 space-y-3.5 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Title</label>
                <input
                  type="text" value={editingAnnouncement.title} onChange={(e) => setEditingAnnouncement({...editingAnnouncement, title: e.target.value})}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#FF9501] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Content</label>
                <textarea
                  value={editingAnnouncement.content} onChange={(e) => setEditingAnnouncement({...editingAnnouncement, content: e.target.value})} rows={4}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#FF9501] outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-gray-700">Recipients</label>
                <div className="flex flex-wrap gap-2">
                  {recipientOptions.map(opt => {
                    const isSelected = editingAnnouncement.recipients.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          const current = editingAnnouncement.recipients ? editingAnnouncement.recipients.split(", ") : [];
                          handleRecipientToggle(opt.value, current, (newVals) => setEditingAnnouncement({...editingAnnouncement, recipients: newVals.join(", ")}))
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors border cursor-pointer ${
                          isSelected ? "bg-[#FF9501] text-white border-[#FF9501]" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              {editingAnnouncement.status === "Scheduled" && (
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700">Schedule Date</label>
                  <input
                    type="datetime-local" 
                    value={editingAnnouncement.schedule_date ? new Date(editingAnnouncement.schedule_date).toISOString().slice(0, 16) : ""} 
                    onChange={(e) => setEditingAnnouncement({...editingAnnouncement, schedule_date: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-[#FF9501] outline-none cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <button 
                onClick={() => handleDeleteAnnouncement(editingAnnouncement.id)} disabled={isModalLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleUpdateAnnouncement(editingAnnouncement.id, "Save")} disabled={isModalLoading}
                  className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
                <button 
                  onClick={() => handleUpdateAnnouncement(editingAnnouncement.id, "Send Now")} disabled={isModalLoading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] transition-colors cursor-pointer shadow-2xs"
                >
                  {isModalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Sent Analytics */}
      {viewingAnnouncement && (() => {
        // Evaluate live targets for the specific modal instance
        const liveModalTargets = viewingAnnouncement.total_recipients || getLiveTargetCount(viewingAnnouncement.recipients);
        const readCount = viewingAnnouncement.read_count || 0;
        const modalReadPercent = liveModalTargets > 0 ? Math.min(100, Math.round((readCount / liveModalTargets) * 100)) : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 bg-gray-50/60">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#FF9501]" />
                  <h3 className="font-bold text-xs sm:text-sm text-gray-900">Broadcast Performance & Analytics</h3>
                </div>
                <button onClick={() => setViewingAnnouncement(null)} className="text-gray-400 hover:text-gray-900 p-1 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="p-5 sm:p-6 space-y-5">
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5">{viewingAnnouncement.title}</h4>
                  <div className="flex flex-wrap gap-2 text-[11px] font-medium text-gray-500 mb-3">
                    <span className="bg-gray-100 px-2.5 py-1 rounded-lg">Sent: {formatDate(viewingAnnouncement.sent_date)}</span>
                    <span className="bg-gray-100 px-2.5 py-1 rounded-lg">By: {viewingAnnouncement.sent_by}</span>
                    <span className="bg-orange-50 text-[#D97E00] border border-[#FF9501]/20 px-2.5 py-1 rounded-lg">Audience: {viewingAnnouncement.recipients}</span>
                  </div>
                  <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200 text-xs text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                    {viewingAnnouncement.content}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      Delivery Performance
                    </h5>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                      {modalReadPercent}% Read Rate
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <span className="text-3xl font-extrabold text-emerald-600">{readCount}</span>
                    <span className="text-xs font-medium text-gray-500">out of {liveModalTargets} recipient{liveModalTargets !== 1 ? 's' : ''} confirmed read</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${modalReadPercent}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 font-medium">
                    <span>Delivered to {liveModalTargets} accounts</span>
                    <span>{liveModalTargets - readCount} pending unread</span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50/60 flex justify-end">
                <button
                  onClick={() => setViewingAnnouncement(null)}
                  className="px-5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}