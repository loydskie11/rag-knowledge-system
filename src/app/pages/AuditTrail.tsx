import { useState, useEffect } from "react";
import { Search, Download, Loader2, X, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import axios from "axios";

type TabType = "queries" | "access" | "versions" | "system";

export function AuditTrail() {
  const [activeTab, setActiveTab] = useState<TabType>("queries");
  
  // Real Data States
  const [queryLogs, setQueryLogs] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [versionLogs, setVersionLogs] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // --- EXPORT MODAL & TOAST STATE ---
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<TabType>("queries");
  const [exportDates, setExportDates] = useState({ start: "", end: "" });
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchAllAuditData = async () => {
      setIsLoading(true);
      try {
        const [queriesRes, accessRes, versionsRes, systemRes] = await Promise.all([
          axios.get("http://localhost:8000/audit/queries"),
          axios.get("http://localhost:8000/audit/access"),
          axios.get("http://localhost:8000/audit/versions"),
          axios.get("http://localhost:8000/audit/system") 
        ]);

        setQueryLogs(queriesRes.data);
        setAccessLogs(accessRes.data);
        setVersionLogs(versionsRes.data);
        setSystemLogs(systemRes.data); 
        
      } catch (error) {
        console.error("Failed to fetch audit logs", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllAuditData();
  }, []);

  const handleExport = () => {
    let dataToExport: any[] = [];
    
    if (exportType === "queries") dataToExport = [...queryLogs];
    if (exportType === "access") dataToExport = [...accessLogs];
    if (exportType === "versions") dataToExport = [...versionLogs];
    if (exportType === "system") dataToExport = [...systemLogs];

    const parseLogDate = (timestampStr: string) => {
      if (!timestampStr || timestampStr === "Unknown Date") return new Date(0);
      const cleanDateString = timestampStr.split(' - ')[0]; 
      return new Date(cleanDateString);
    };

    if (exportDates.start) {
      const startDate = new Date(exportDates.start);
      startDate.setHours(0, 0, 0, 0); 
      dataToExport = dataToExport.filter(log => parseLogDate(log.timestamp) >= startDate);
    }
    
    if (exportDates.end) {
      const endDate = new Date(exportDates.end);
      endDate.setHours(23, 59, 59, 999); 
      dataToExport = dataToExport.filter(log => parseLogDate(log.timestamp) <= endDate);
    }

    if (dataToExport.length === 0) {
      showToast("No records found in this date range.", "error");
      return;
    }

    const headers = Object.keys(dataToExport[0]).filter(k => k !== 'id').join(',');
    const rows = dataToExport.map(row => {
      return Object.entries(row)
        .filter(([key]) => key !== 'id')
        .map(([_, value]) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',');
    }).join('\n');

    const csvContent = headers + '\n' + rows;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CTU_Audit_${exportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowExportModal(false);
    showToast(`Successfully exported ${dataToExport.length} records!`, "success");
  };

  const filteredData = activeTab === "queries" 
    ? queryLogs.filter(log => log.user.toLowerCase().includes(searchQuery.toLowerCase()) || log.query.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeTab === "access"
    ? accessLogs.filter(log => log.user.toLowerCase().includes(searchQuery.toLowerCase()) || log.document.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeTab === "versions"
    ? versionLogs.filter(log => log.document.toLowerCase().includes(searchQuery.toLowerCase()) || log.user.toLowerCase().includes(searchQuery.toLowerCase()))
    : systemLogs.filter(log => log.user.toLowerCase().includes(searchQuery.toLowerCase()) || log.description.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 relative">

      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium z-50 transition-all duration-300 animate-in slide-in-from-bottom-3 fade-in ${
          toast.type === 'success' 
            ? 'bg-[#FFF4E5] text-[#DD7230] border border-[#DD7230]/30' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-[#DD7230]" /> : <AlertCircle className="h-4 w-4 text-rose-500" />}
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">System Audit Trail</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Track and audit system activities, user queries, document access, and security events.</p>
        </div>
        <button 
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#DD7230] text-white text-xs font-semibold rounded-lg hover:bg-[#DD7230] transition-colors shadow-2xs cursor-pointer active:scale-95 shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          Export Report
        </button>
      </div>

      {/* Statistics Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">AI Queries</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-bold text-gray-900">{queryLogs.length}</h3>
            <span className="text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium">Interactions</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Document Access</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-bold text-gray-900">{accessLogs.length}</h3>
            <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">Views & DL</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Version Updates</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-bold text-gray-900">{versionLogs.length}</h3>
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">Changes</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Security Events</p>
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-2xl font-bold text-gray-900">{systemLogs.length}</h3>
            <span className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">Auth & Logs</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Header and Controls */}
        <div className="p-4 sm:p-5 border-b border-gray-200 bg-gray-50/50">
          <div className="flex flex-col md:flex-row gap-3 justify-between">
            <div className="flex bg-gray-100/80 p-1 rounded-xl border border-gray-200 w-full md:w-auto overflow-x-auto gap-1">
              <button
                onClick={() => setActiveTab("queries")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "queries" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                AI Query Logs ({queryLogs.length})
              </button>
              <button
                onClick={() => setActiveTab("access")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "access" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Document Access ({accessLogs.length})
              </button>
              <button
                onClick={() => setActiveTab("versions")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "versions" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Version History ({versionLogs.length})
              </button>
              <button
                onClick={() => setActiveTab("system")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === "system" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                System Events ({systemLogs.length})
              </button>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-colors" 
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-700 rounded-full transition-all cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="overflow-x-auto min-h-[360px]">
          {isLoading ? (
             <div className="flex justify-center items-center h-[360px]">
                <Loader2 className="h-6 w-6 animate-spin text-[#DD7230]" />
             </div>
          ) : activeTab === "queries" ? (
            <table className="w-full text-left whitespace-nowrap table-fixed min-w-[800px]">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="w-[25%] px-4 py-3">User</th>
                  <th className="w-[45%] px-4 py-3">Query Sent to AI</th>
                  <th className="w-[20%] px-4 py-3">Timestamp</th>
                  <th className="w-[10%] px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                      No query logs found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 truncate">
                        <div className="font-medium text-gray-900 truncate" title={log.user}>{log.user}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5 truncate">{log.role || "STUDENT"}</div>
                      </td>
                      <td className="px-4 py-3 truncate">
                        <span className="text-gray-700 truncate block" title={log.query}>
                          {log.query}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 truncate">{log.timestamp}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {log.status || "Answered"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === "access" ? (
            <table className="w-full text-left whitespace-nowrap table-fixed min-w-[800px]">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="w-[25%] px-4 py-3">User</th>
                  <th className="w-[45%] px-4 py-3">Document Accessed</th>
                  <th className="w-[10%] px-4 py-3">Action</th>
                  <th className="w-[20%] px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                      No access logs found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 truncate">
                        <div className="font-medium text-gray-900 truncate" title={log.user}>{log.user}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5 truncate">{log.role}</div>
                      </td>
                      <td className="px-4 py-3 truncate">
                        <span className="font-medium text-gray-800 truncate block" title={log.document}>
                          {log.document}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                          log.action === 'Download' 
                            ? 'bg-amber-50 text-amber-800 border-amber-200/60' 
                            : 'bg-blue-50 text-blue-700 border-blue-200/60'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 truncate">{log.timestamp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === "versions" ? (
            <table className="w-full text-left whitespace-nowrap table-fixed min-w-[800px]">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="w-[35%] px-4 py-3">Document Name</th>
                  <th className="w-[10%] px-4 py-3">Version</th>
                  <th className="w-[20%] px-4 py-3">Updated By</th>
                  <th className="w-[20%] px-4 py-3">Timestamp</th>
                  <th className="w-[15%] px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      No version history found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 truncate">
                        <span className="font-medium text-gray-900 truncate block" title={log.document}>
                          {log.document}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700">
                        v{log.version}
                      </td>
                      <td className="px-4 py-3 truncate">
                        <span className="text-gray-700 truncate block" title={log.user}>{log.user}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 truncate">{log.timestamp}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                          log.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' 
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === "system" ? (
            <table className="w-full text-left whitespace-nowrap table-fixed min-w-[800px]">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="w-[25%] px-4 py-3">User Account</th>
                  <th className="w-[20%] px-4 py-3">Event Type</th>
                  <th className="w-[35%] px-4 py-3">Description</th>
                  <th className="w-[20%] px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                      No system events found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 truncate">
                        <span className="font-medium text-gray-900 truncate block" title={log.user}>{log.user}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                          log.type === 'Authentication' 
                            ? 'bg-gray-100 text-gray-800 border-gray-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200/60'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 truncate">
                        <span className="text-gray-700 truncate block" title={log.description}>{log.description}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 truncate">{log.timestamp}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

      {/* --- EXPORT MODAL --- */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl overflow-hidden border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-900">Export Audit Report</h2>
              <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-gray-200 rounded-md transition-colors cursor-pointer text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Select Log Type</label>
                <select 
                  value={exportType}
                  onChange={(e) => setExportType(e.target.value as TabType)}
                  className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                >
                  <option value="queries">AI Query Logs</option>
                  <option value="access">Document Access Logs</option>
                  <option value="versions">Version History Logs</option>
                  <option value="system">System Events</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input 
                      type="date" 
                      value={exportDates.start}
                      onChange={(e) => setExportDates({...exportDates, start: e.target.value})}
                      className="w-full pl-8 pr-2 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-xs cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input 
                      type="date" 
                      value={exportDates.end}
                      onChange={(e) => setExportDates({...exportDates, end: e.target.value})}
                      className="w-full pl-8 pr-2 py-2 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-xs cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 italic">Leave dates blank to export all history for this log type.</p>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-end gap-2">
              <button 
                onClick={() => setShowExportModal(false)} 
                className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleExport} 
                className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg bg-[#DD7230] hover:bg-[#DD7230] transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
              >
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}