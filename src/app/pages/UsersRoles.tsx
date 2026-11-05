import { useState, useEffect } from "react";
import { Search, UserPlus, Ban, UserX, CheckCircle, Clock, XCircle, AlertCircle, X, ShieldAlert, ShieldCheck, Unlock, Loader2, Award, GraduationCap, Building2, Eye, EyeOff } from "lucide-react";
import apiClient from "../api/client";
import { CAMPUS_COLLEGES, CAMPUS_PROGRAMS, roleLabel } from "../constants/academicScopes";

export { CAMPUS_COLLEGES, CAMPUS_PROGRAMS } from "../constants/academicScopes";

export const ISO_OFFICES_16 = [
  "Campus Director",
  "Academic Affairs",
  "Student Affairs & Services",
  "Administrative & Finance",
  "Research & Development",
  "Extension & Community Services",
  "Production & Resource Generation",
  "Quality Assurance & Management (QAU)",
  "Registrar's Office",
  "Guidance & Placement",
  "University Library",
  "Medical & Dental Clinic",
  "Supply & Property Unit",
  "HR & Records Management",
  "MIS & Information Technology Unit",
  "Security & Physical Plant Unit"
];

export function UsersRoles() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showMobileMetrics, setShowMobileMetrics] = useState(false);

  // --- TOAST NOTIFICATIONS ---
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- MODAL STATES ---
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [addUserData, setAddUserData] = useState({ 
    name: "", 
    email: "", 
    role: "FACULTY", 
    password: "", 
    administrative_office: "", 
    is_iqa_auditor: false,
    designation: "Faculty Member",
    designation_entity: "BSIT"
  });

  // Edit User State
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [userToReject, setUserToReject] = useState<any>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Disable State
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [userToDisable, setUserToDisable] = useState<any>(null);
  const [isDisabling, setIsDisabling] = useState(false);

  // Enable State
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [userToEnable, setUserToEnable] = useState<any>(null);
  const [isEnabling, setIsEnabling] = useState(false);

  // Officer Confirmation Modal State
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [userForOfficerToggle, setUserForOfficerToggle] = useState<any>(null);
  const [isTogglingOfficer, setIsTogglingOfficer] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get("/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      showToast("Failed to load users from database.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (userId: string) => {
    try {
      await apiClient.put(`/users/${userId}/verify`);
      fetchUsers();
      showToast("Faculty account approved successfully!", "success");
    } catch (error) {
      showToast("Failed to approve faculty account.", "error");
    }
  };

  const executeReject = async () => {
    if (!userToReject) return;
    setIsRejecting(true);
    try {
      await apiClient.delete(`/users/${userToReject.id}`);
      fetchUsers();
      setShowRejectModal(false);
      setUserToReject(null);
      showToast("Pending request rejected and removed.", "success");
    } catch (error) {
      showToast("Failed to reject faculty account.", "error");
    } finally {
      setIsRejecting(false);
    }
  };

  const executeDisable = async () => {
    if (!userToDisable) return;
    setIsDisabling(true);
    try {
      await apiClient.put(`/users/${userToDisable.id}/disable`);
      fetchUsers();
      setShowDisableModal(false);
      setUserToDisable(null);
      showToast("User account has been disabled.", "success");
    } catch (error) {
      showToast("Failed to disable user account.", "error");
    } finally {
      setIsDisabling(false);
    }
  };

  const executeEnable = async () => {
    if (!userToEnable) return;
    setIsEnabling(true);
    try {
      await apiClient.put(`/users/${userToEnable.id}/enable`);
      fetchUsers();
      setShowEnableModal(false);
      setUserToEnable(null);
      showToast("User account has been re-enabled.", "success");
    } catch (error) {
      showToast("Failed to re-enable user account.", "error");
    } finally {
      setIsEnabling(false);
    }
  };

  const handleAddUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    const roleDefaults = e.target.name === "role" ? {
      designation_entity: ["COLLEGE_DEAN", "COLLEGE_SECRETARY"].includes(value)
        ? CAMPUS_COLLEGES[0]
        : ["PROGRAM_CHAIR", "FACULTY"].includes(value) ? CAMPUS_PROGRAMS[0].code : "",
      administrative_office: value === "DOCUMENT_CONTROLLER" ? "Document Control Office" : "",
      is_iqa_auditor: false,
    } : {};
    setAddUserData({
      ...addUserData,
      [e.target.name]: value,
      ...roleDefaults,
    });
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserData.name || !addUserData.email || !addUserData.role || !addUserData.password) {
      showToast("Please fill out all required fields.", "error");
      return;
    }
    setIsCreating(true);
    try {
      await apiClient.post("/users", {
        full_name: addUserData.name,
        email: addUserData.email,
        role: addUserData.role,
        password: addUserData.password,
        department: addUserData.role === "DOCUMENT_CONTROLLER" ? null : addUserData.designation_entity || null,
        administrative_office: addUserData.administrative_office || null,
        is_iqa_auditor: addUserData.is_iqa_auditor
      });

      showToast(`${addUserData.role} ${addUserData.name} created successfully!`, "success");
      setShowAddUserModal(false);
      setAddUserData({ name: "", email: "", role: "FACULTY", password: "", administrative_office: "", is_iqa_auditor: false, designation: "Faculty Member", designation_entity: "BEED" });
      fetchUsers();
    } catch (error: any) {
      showToast(error.response?.data?.detail || "Failed to create user.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editingUser.full_name) {
      showToast("Please fill out all required fields.", "error");
      return;
    }
    setIsUpdatingUser(true);
    try {
      const assignedEntity = editingUser.designation_entity ?? editingUser.department ?? "";
      if (editingUser.id) {
        await apiClient.put(`/users/${editingUser.id}/details`, {
          administrative_office: editingUser.administrative_office || null,
          role: editingUser.role,
          is_iqa_auditor: Boolean(editingUser.is_iqa_auditor),
          designation: editingUser.designation || "Faculty Member",
          designation_entity: assignedEntity,
          email: editingUser.email,
          full_name: editingUser.full_name
        });
      }

      showToast(`User ${editingUser.full_name} updated successfully!`, "success");
      setShowEditUserModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      showToast(error.response?.data?.detail || "Failed to update user.", "error");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const openOfficerModal = (user: any) => {
    setUserForOfficerToggle(user);
    setShowOfficerModal(true);
  };

  const executeToggleOfficer = async () => {
    if (!userForOfficerToggle) return;
    setIsTogglingOfficer(true);
    try {
      const newStatus = !userForOfficerToggle.is_iqa_auditor;
      await apiClient.put(`/users/${userForOfficerToggle.id}/details`, {
        administrative_office: userForOfficerToggle.administrative_office || null,
        is_iqa_auditor: newStatus,
        designation: userForOfficerToggle.designation,
        designation_entity: userForOfficerToggle.department
      });

      showToast(`Audit Officer status ${newStatus ? 'granted to' : 'revoked from'} ${userForOfficerToggle.full_name || userForOfficerToggle.email}.`, "success");
      fetchUsers();
      setShowOfficerModal(false);
      setUserForOfficerToggle(null);
    } catch (error: any) {
      showToast(error.response?.data?.detail || "Failed to update Audit Officer status.", "error");
    } finally {
      setIsTogglingOfficer(false);
    }
  };

  const pendingFaculty = users.filter(u => u.role === "FACULTY" && !u.is_verified);
  const registeredUsers = users.filter(u => u.is_verified || u.role === "SYSTEM_ADMIN");

  const filteredUsers = registeredUsers.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const matchesName = user.full_name?.toLowerCase().includes(searchLower) || false;
    const matchesEmail = user.email?.toLowerCase().includes(searchLower) || false;
    const matchesDesignation = user.designation?.toLowerCase().includes(searchLower) || false;
    const matchesSearch = matchesName || matchesEmail || matchesDesignation;
    
    const matchesRole = 
      selectedRole === "all" 
        ? true 
        : selectedRole === "IQA_AUDITOR" 
          ? Boolean(user.is_iqa_auditor) 
          : user.role === selectedRole;
    
    const userStatus = user.status || "Active";
    const matchesStatus = selectedStatus === "all" || userStatus === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const roleStats = [
    { role: "System Administrator", userCount: users.filter(u => u.role === "SYSTEM_ADMIN").length, color: "#DD7230", filterRole: "SYSTEM_ADMIN" },
    { role: "College Leadership", userCount: users.filter(u => ["COLLEGE_DEAN", "COLLEGE_SECRETARY"].includes(u.role)).length, color: "#7C3AED", filterRole: "COLLEGE_DEAN" },
    { role: "Program Chairs", userCount: users.filter(u => u.role === "PROGRAM_CHAIR").length, color: "#2563EB", filterRole: "PROGRAM_CHAIR" },
    { role: "Faculty", userCount: users.filter(u => u.role === "FACULTY").length, color: "#FDB913", filterRole: "FACULTY" },
    { role: "Office Heads", userCount: users.filter(u => u.role === "OFFICE_HEAD").length, color: "#059669", filterRole: "OFFICE_HEAD" },
    { role: "Document Controller", userCount: users.filter(u => u.role === "DOCUMENT_CONTROLLER").length, color: "#0D9488", filterRole: "DOCUMENT_CONTROLLER" },
    { role: "Lead Audit Officers", userCount: users.filter(u => u.is_iqa_auditor).length, color: "#EA580C", filterRole: "IQA_AUDITOR" },
    { role: "Students", userCount: users.filter(u => u.role === "STUDENT").length, color: "#6366F1", filterRole: "STUDENT" },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#DD7230]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-10">
      
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Users & Roles Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage user directories, college leadership, program chairs, and ISO office matrix</p>
        </div>
        <button 
          onClick={() => setShowAddUserModal(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-[#DD7230] text-white rounded-lg hover:bg-[#DD7230] transition-colors text-xs font-semibold cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* Mobile Toggle for Metric Cards */}
      <div className="flex sm:hidden items-center justify-between">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Role Breakdown</span>
        <button
          type="button"
          onClick={() => setShowMobileMetrics((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
        >
          {showMobileMetrics ? (
            <>
              <EyeOff className="h-3.5 w-3.5 text-gray-500" />
              <span>Hide Metrics</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5 text-[#DD7230]" />
              <span>Show Metrics ({roleStats.length})</span>
            </>
          )}
        </button>
      </div>

      {/* Metric Cards */}
      <div className={`${showMobileMetrics ? 'grid' : 'hidden sm:grid'} grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 transition-all`}>
        {roleStats.map((stat) => (
          <div 
            key={stat.role} 
            onClick={() => {
              if (stat.filterRole && stat.filterRole !== "all") {
                setSelectedRole(selectedRole === stat.filterRole ? "all" : stat.filterRole);
              }
            }}
            className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
              selectedRole === stat.filterRole 
                ? 'border-gray-400 shadow-xs bg-gray-50/60' 
                : 'border-gray-200/80 bg-white shadow-2xs hover:border-gray-400 hover:shadow-xs hover:bg-gray-50/30'
            }`}
            title={`Click to filter by ${stat.role}`}
          >
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{stat.role}</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.userCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${stat.color}15` }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }}></span>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Approvals Table */}
      {pendingFaculty.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-amber-100 bg-amber-50/50 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#DD7230]" />
            <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Pending Faculty Registrations ({pendingFaculty.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-amber-50/20 border-b border-amber-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">Academic Department</th>
                  <th className="px-4 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/60">
                {pendingFaculty.map((user) => (
                  <tr key={user.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-900">{user.full_name || "N/A"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{user.department || "Academic Unit"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleApprove(user.id)} 
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => { setUserToReject(user); setShowRejectModal(true); }} 
                          className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Users Table */}
      <div className="space-y-4">
        {/* Search and Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search by name, email, or designation..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-9 pr-8 py-2 bg-gray-50/50 border border-gray-200/80 hover:border-gray-400 rounded-lg text-xs focus:outline-none focus:border-gray-400 focus:shadow-xs focus:bg-white transition-all" 
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2.5 w-full sm:w-auto">
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)} 
                className="w-full sm:w-40 px-3 py-2 bg-gray-50/50 border border-gray-200/80 hover:border-gray-400 rounded-lg text-xs focus:outline-none focus:border-gray-400 focus:shadow-xs focus:bg-white text-gray-700 cursor-pointer transition-all"
              >
                <option value="all">All Roles</option>
                <option value="SYSTEM_ADMIN">System Administrator</option>
                <option value="OFFICE_HEAD">Office Head</option>
                <option value="COLLEGE_DEAN">College Dean</option>
                <option value="PROGRAM_CHAIR">Program Chair</option>
                <option value="COLLEGE_SECRETARY">College Secretary</option>
                <option value="DOCUMENT_CONTROLLER">Document Controller</option>
                <option value="FACULTY">Faculty</option>
                <option value="STUDENT">Student</option>
                <option value="IQA_AUDITOR">Lead Audit Officers</option>
              </select>

              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)} 
                className="w-full sm:w-40 px-3 py-2 bg-gray-50/50 border border-gray-200/80 hover:border-gray-400 rounded-lg text-xs focus:outline-none focus:border-gray-400 focus:shadow-xs focus:bg-white text-gray-700 cursor-pointer transition-all"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role & Designation</th>
                  <th className="px-4 py-3">ISO Admin Office</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/70">
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">No users found matching your filters.</td></tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs font-semibold text-gray-900">{user.full_name || "N/A"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        {['COLLEGE_DEAN', 'PROGRAM_CHAIR', 'COLLEGE_SECRETARY', 'FACULTY'].includes(user.role) ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md border bg-blue-50 text-blue-700 border-blue-200">
                              {roleLabel(user.role)}{user.department ? ` • ${user.department}` : ''}
                            </span>
                            {user.is_iqa_auditor && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-orange-100 text-[#DD7230] rounded-md border border-orange-200">
                                IQA Auditor
                              </span>
                            )}
                          </div>
                        ) : user.role === 'SYSTEM_ADMIN' ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md border bg-orange-50 text-[#DD7230] border-[#DD7230]/30">
                              SYSTEM ADMIN
                            </span>
                            {user.is_iqa_auditor && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-orange-100 text-[#DD7230] rounded-md border border-orange-200">
                                Audit Officer
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-md border bg-emerald-50 text-emerald-700 border-emerald-200/60">
                            {roleLabel(user.role)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.role === 'STUDENT' ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md border ${
                            user.administrative_office 
                              ? 'bg-slate-50 text-slate-700 border-slate-200'
                              : 'bg-gray-100 text-gray-400 border-gray-200'
                          }`}>
                            {user.administrative_office || "Academic Only"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                          (user.status || 'Active') === 'Active' 
                          ? 'bg-emerald-50 border-emerald-200/60 text-emerald-700' 
                          : 'bg-gray-100 border-gray-200 text-gray-500'
                        }`}>
                          {user.status || "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => { setEditingUser({ ...user }); setShowEditUserModal(true); }}
                              className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              title="Edit User Details & Designations"
                            >
                              Edit Profile
                            </button>
                          {(user.role === 'SYSTEM_ADMIN' || ['OFFICE_HEAD', 'FACULTY', 'COLLEGE_DEAN', 'PROGRAM_CHAIR', 'COLLEGE_SECRETARY'].includes(user.role)) && user.role !== 'STUDENT' && (
                            <button
                              onClick={() => openOfficerModal(user)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shadow-2xs ${
                                user.is_iqa_auditor 
                                  ? 'bg-orange-50 text-[#DD7230] border-[#DD7230]/40 hover:bg-orange-100' 
                                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                              }`}
                              title={user.is_iqa_auditor ? "Revoke Lead Audit Officer Designation" : "Designate as Lead Audit Officer"}
                            >
                              {user.is_iqa_auditor ? "Audit Officer: Active" : "+ Audit Officer"}
                            </button>
                          )}
                          {user.role !== 'SYSTEM_ADMIN' && (
                            (user.status || 'Active') === 'Active' ? (
                              <button 
                                onClick={() => { setUserToDisable(user); setShowDisableModal(true); }} 
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" 
                                title="Disable Account"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => { setUserToEnable(user); setShowEnableModal(true); }} 
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer" 
                                title="Re-enable Account"
                              >
                                <Unlock className="h-3.5 w-3.5" />
                              </button>
                            )
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
      </div>

      {/* --- ADD USER MODAL --- */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-xs font-semibold text-gray-900">Create New System Account</h2>
                <p className="text-[11px] text-gray-500">Add faculty, student, or administrative user</p>
              </div>
              <button onClick={() => setShowAddUserModal(false)} className="p-1 hover:bg-gray-200 rounded-md transition-colors cursor-pointer text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddUserSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name <span className="text-rose-500">*</span></label>
                <input type="text" name="name" required value={addUserData.name} onChange={handleAddUserChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]" placeholder="e.g., Dr. Jane Doe" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address <span className="text-rose-500">*</span></label>
                <input type="email" name="email" required value={addUserData.email} onChange={handleAddUserChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]" placeholder="jane.doe@ctu.edu.ph" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">System Role <span className="text-rose-500">*</span></label>
                <select name="role" value={addUserData.role} onChange={handleAddUserChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer">
                  <option value="SYSTEM_ADMIN">System Administrator</option>
                  <option value="OFFICE_HEAD">Office Head</option>
                  <option value="COLLEGE_DEAN">College Dean</option>
                  <option value="PROGRAM_CHAIR">Program Chair</option>
                  <option value="COLLEGE_SECRETARY">College Secretary</option>
                  <option value="DOCUMENT_CONTROLLER" disabled={users.some((u) => u.role === "DOCUMENT_CONTROLLER")}>Document Controller (one campus account)</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>

              {addUserData.role === "OFFICE_HEAD" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Assigned academic program (optional)</label>
                  <select value={addUserData.designation_entity || ""}
                    onChange={(e) => setAddUserData({ ...addUserData, designation_entity: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs">
                    <option value="">No program assignment</option>
                    {CAMPUS_PROGRAMS.map((program) => <option key={program.code} value={program.code}>{program.label}</option>)}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Controls access to CHED and AACCUP records. Office access is assigned separately below.</p>
                </div>
              )}

              {(["PROGRAM_CHAIR", "FACULTY"].includes(addUserData.role)) && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Assigned Academic Program</label>
                  <select value={addUserData.designation_entity} onChange={(e) => setAddUserData({ ...addUserData, designation_entity: e.target.value })} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs">
                    {CAMPUS_PROGRAMS.map((program) => <option key={program.code} value={program.code}>{program.label}</option>)}
                  </select>
                </div>
              )}

              {(["COLLEGE_DEAN", "COLLEGE_SECRETARY"].includes(addUserData.role)) && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Assigned College</label>
                  <select value={addUserData.designation_entity || CAMPUS_COLLEGES[0]} onChange={(e) => setAddUserData({ ...addUserData, designation_entity: e.target.value })} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs">
                    {CAMPUS_COLLEGES.map((college) => <option key={college} value={college}>{college}</option>)}
                  </select>
                </div>
              )}

              {addUserData.role !== "STUDENT" && addUserData.role !== "DOCUMENT_CONTROLLER" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Administrative Office (governance scope)</label>
                  <select 
                    name="administrative_office" 
                    required={addUserData.role === "OFFICE_HEAD"}
                    value={addUserData.administrative_office} 
                    onChange={handleAddUserChange} 
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                  >
                    <option value="">None / Unassigned (Academic Only)</option>
                    {ISO_OFFICES_16.map((off) => (
                      <option key={off} value={off}>{off}</option>
                    ))}
                  </select>
                </div>
              )}

              {addUserData.role === "DOCUMENT_CONTROLLER" && (
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-800">
                  This sole campus role is assigned to the Document Control Office and has exclusive authority to modify Paper Trail records.
                </div>
              )}

              {(["OFFICE_HEAD", "FACULTY", "COLLEGE_DEAN", "PROGRAM_CHAIR", "COLLEGE_SECRETARY"].includes(addUserData.role)) && (
                <div className="flex items-start gap-2.5 p-2.5 bg-orange-50/50 border border-[#DD7230]/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="add_is_iqa_auditor"
                    checked={addUserData.is_iqa_auditor}
                    onChange={(e) => setAddUserData({ ...addUserData, is_iqa_auditor: e.target.checked })}
                    className="h-3.5 w-3.5 mt-0.5 text-[#DD7230] focus:ring-[#DD7230] border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="add_is_iqa_auditor" className="text-xs text-gray-700 font-medium cursor-pointer">
                    Designate as Lead Audit Officer / Internal Quality Auditor (IQA Auditor)
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Temporary Password <span className="text-rose-500">*</span></label>
                <input type="password" name="password" required value={addUserData.password} onChange={handleAddUserChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]" placeholder="Enter secure password" />
              </div>
            
              <div className="pt-2 flex gap-2 justify-end border-t border-gray-200 shrink-0">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating || !addUserData.name.trim() || !addUserData.email.trim() || !addUserData.password.trim()} className="px-4 py-1.5 text-xs font-semibold bg-[#DD7230] text-white rounded-lg hover:bg-[#DD7230] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs">
                   {isCreating ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Creating...</> : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT USER & OFFICE ASSIGNMENT MODAL --- */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-xs font-semibold text-gray-900">Edit User Details & Roles</h2>
                <p className="text-[11px] text-gray-500">Update user profile and academic designations</p>
              </div>
              <button onClick={() => setShowEditUserModal(false)} className="p-1 hover:bg-gray-200 rounded-md transition-colors cursor-pointer text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleEditUserSubmit} className="p-5 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={editingUser.full_name || ""} 
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })} 
                  className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={editingUser.email || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} 
                  className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">System Role</label>
                <select
                  value={editingUser.role || "FACULTY"}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    role: e.target.value,
                    designation_entity: ["COLLEGE_DEAN", "COLLEGE_SECRETARY"].includes(e.target.value)
                      ? CAMPUS_COLLEGES[0]
                      : ["PROGRAM_CHAIR", "FACULTY"].includes(e.target.value) ? CAMPUS_PROGRAMS[0].code : "",
                    administrative_office: e.target.value === "DOCUMENT_CONTROLLER" ? "Document Control Office" : "",
                    is_iqa_auditor: false,
                  })}
                  className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                >
                  <option value="SYSTEM_ADMIN">System Administrator</option>
                  <option value="OFFICE_HEAD">Office Head</option>
                  <option value="COLLEGE_DEAN">College Dean</option>
                  <option value="PROGRAM_CHAIR">Program Chair</option>
                  <option value="COLLEGE_SECRETARY">College Secretary</option>
                  <option value="DOCUMENT_CONTROLLER" disabled={users.some((u) => u.role === "DOCUMENT_CONTROLLER" && u.id !== editingUser.id)}>Document Controller (one campus account)</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>

              {editingUser.role === "OFFICE_HEAD" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Assigned academic program (optional)</label>
                  <select value={editingUser.designation_entity || editingUser.department || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, designation_entity: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs">
                    <option value="">No program assignment</option>
                    {CAMPUS_PROGRAMS.map((program) => <option key={program.code} value={program.code}>{program.label}</option>)}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Controls access to CHED and AACCUP records. Office access is assigned separately below.</p>
                </div>
              )}

              {(["PROGRAM_CHAIR", "FACULTY"].includes(editingUser.role)) && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Assigned Academic Program</label>
                  <select value={editingUser.designation_entity || editingUser.department || CAMPUS_PROGRAMS[0].code} onChange={(e) => setEditingUser({ ...editingUser, designation_entity: e.target.value })} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs">
                    {CAMPUS_PROGRAMS.map((program) => <option key={program.code} value={program.code}>{program.label}</option>)}
                  </select>
                </div>
              )}

              {(["COLLEGE_DEAN", "COLLEGE_SECRETARY"].includes(editingUser.role)) && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Assigned College</label>
                  <select value={editingUser.designation_entity || editingUser.department || CAMPUS_COLLEGES[0]} onChange={(e) => setEditingUser({ ...editingUser, designation_entity: e.target.value })} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs">
                    {CAMPUS_COLLEGES.map((college) => <option key={college} value={college}>{college}</option>)}
                  </select>
                </div>
              )}

              {editingUser.role !== "STUDENT" && editingUser.role !== "DOCUMENT_CONTROLLER" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Administrative Office (governance scope)</label>
                  <select 
                    required={editingUser.role === "OFFICE_HEAD"}
                    value={editingUser.administrative_office || ""} 
                    onChange={(e) => setEditingUser({ ...editingUser, administrative_office: e.target.value })} 
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                  >
                    <option value="">None / Unassigned (Academic Only)</option>
                    {ISO_OFFICES_16.map((off) => (
                      <option key={off} value={off}>{off}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Assigning an office scopes ISO audit dashboards to that unit.</p>
                </div>
              )}

              {editingUser.role === "DOCUMENT_CONTROLLER" && (
                <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-xs text-blue-800">
                  Assigned to Document Control Office. This user alone can register, attach, route, return, and close Paper Trail records.
                </div>
              )}

              {(["OFFICE_HEAD", "FACULTY", "COLLEGE_DEAN", "PROGRAM_CHAIR", "COLLEGE_SECRETARY"].includes(editingUser.role)) && (
                <div className="flex items-start gap-2.5 p-2.5 bg-orange-50/50 border border-[#DD7230]/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="edit_is_iqa_auditor"
                    checked={Boolean(editingUser.is_iqa_auditor)}
                    onChange={(e) => setEditingUser({ ...editingUser, is_iqa_auditor: e.target.checked })}
                    className="h-3.5 w-3.5 mt-0.5 text-[#DD7230] focus:ring-[#DD7230] border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="edit_is_iqa_auditor" className="text-xs text-gray-700 font-medium cursor-pointer">
                    Designate as Lead Audit Officer / Internal Quality Auditor (IQA Auditor) — Campus-wide audit access
                  </label>
                </div>
              )}
            
              <div className="pt-2 flex gap-2 justify-end border-t border-gray-200 shrink-0">
                <button type="button" onClick={() => setShowEditUserModal(false)} className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isUpdatingUser || !editingUser?.full_name?.trim()} className="px-4 py-1.5 text-xs font-semibold bg-[#DD7230] text-white rounded-lg hover:bg-[#DD7230] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs">
                   {isUpdatingUser ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Saving...</> : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DISABLE ACCOUNT MODAL --- */}
      {showDisableModal && userToDisable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-rose-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-rose-700">
                <ShieldAlert className="h-4 w-4" />
                <h2 className="text-xs font-semibold">Disable Account</h2>
              </div>
              <button onClick={() => setShowDisableModal(false)} className="p-1 hover:bg-rose-100 rounded-md transition-colors cursor-pointer text-rose-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                You are about to disable the account for <span className="font-semibold text-gray-900">{userToDisable.full_name} ({userToDisable.email})</span>.
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                They will lose login access, but previously uploaded records will remain intact.
              </p>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-end gap-2">
              <button onClick={() => setShowDisableModal(false)} disabled={isDisabling} className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={executeDisable} disabled={isDisabling} className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs">
                {isDisabling ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Disabling...</> : "Disable Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ENABLE ACCOUNT MODAL --- */}
      {showEnableModal && userToEnable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-emerald-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-emerald-700">
                <Unlock className="h-4 w-4" />
                <h2 className="text-xs font-semibold">Re-enable Account</h2>
              </div>
              <button onClick={() => setShowEnableModal(false)} className="p-1 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer text-emerald-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                Restore login access for <span className="font-semibold text-gray-900">{userToEnable.full_name} ({userToEnable.email})</span>.
              </p>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-end gap-2">
              <button onClick={() => setShowEnableModal(false)} disabled={isEnabling} className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={executeEnable} disabled={isEnabling} className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs">
                {isEnabling ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Enabling...</> : "Re-enable Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REJECT PENDING ACCOUNT MODAL --- */}
      {showRejectModal && userToReject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-rose-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-rose-700">
                <UserX className="h-4 w-4" />
                <h2 className="text-xs font-semibold">Reject Registration</h2>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-rose-100 rounded-md transition-colors cursor-pointer text-rose-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-600 leading-relaxed">
                Are you sure you want to reject the faculty registration for <span className="font-semibold text-gray-900">{userToReject.email}</span>?
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                This will permanently delete their pending request.
              </p>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-end gap-2">
              <button onClick={() => setShowRejectModal(false)} disabled={isRejecting} className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={executeReject} disabled={isRejecting} className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs">
                {isRejecting ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Rejecting...</> : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- AUDIT OFFICER CONFIRMATION MODAL (GRANT / REVOKE) --- */}
      {showOfficerModal && userForOfficerToggle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-gray-200 overflow-hidden">
            {userForOfficerToggle.is_iqa_auditor ? (
              // REVOKE CONFIRMATION
              <>
                <div className="p-4 border-b border-gray-200 bg-rose-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-rose-700">
                    <ShieldAlert className="h-4 w-4" />
                    <h2 className="text-xs font-semibold">Revoke Lead Audit Officer Designation</h2>
                  </div>
                  <button 
                    onClick={() => { setShowOfficerModal(false); setUserForOfficerToggle(null); }} 
                    disabled={isTogglingOfficer}
                    className="p-1 hover:bg-rose-100 rounded-md transition-colors cursor-pointer text-rose-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="p-5 space-y-3">
                  <p className="text-xs text-gray-700 leading-relaxed">
                    You are about to revoke the <strong>Lead Audit Officer / Internal Quality Auditor (IQA)</strong> designation for{" "}
                    <span className="font-semibold text-gray-900">{userForOfficerToggle.full_name || userForOfficerToggle.email}</span>.
                  </p>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                    <p className="font-semibold">⚠️ Access Impact:</p>
                    <p className="text-[11px] text-amber-700">
                      This user will immediately lose campus-wide audit review privileges, IQA assessment capabilities, and unrestricted access to cross-office CAR audit cycles.
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-end gap-2">
                  <button 
                    onClick={() => { setShowOfficerModal(false); setUserForOfficerToggle(null); }} 
                    disabled={isTogglingOfficer} 
                    className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executeToggleOfficer} 
                    disabled={isTogglingOfficer} 
                    className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {isTogglingOfficer ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Revoking...</> : "Revoke Officer Status"}
                  </button>
                </div>
              </>
            ) : (
              // GRANT CONFIRMATION
              <>
                <div className="p-4 border-b border-gray-200 bg-orange-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-[#DD7230]">
                    <ShieldCheck className="h-4 w-4" />
                    <h2 className="text-xs font-semibold">Grant Lead Audit Officer Designation</h2>
                  </div>
                  <button 
                    onClick={() => { setShowOfficerModal(false); setUserForOfficerToggle(null); }} 
                    disabled={isTogglingOfficer}
                    className="p-1 hover:bg-orange-100 rounded-md transition-colors cursor-pointer text-[#DD7230]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="p-5 space-y-3">
                  <p className="text-xs text-gray-700 leading-relaxed">
                    You are about to designate{" "}
                    <span className="font-semibold text-gray-900">{userForOfficerToggle.full_name || userForOfficerToggle.email}</span>{" "}
                    as a <strong>Lead Audit Officer / Internal Quality Auditor (IQA Auditor)</strong>.
                  </p>
                  <div className="p-3 bg-orange-50/60 border border-[#DD7230]/30 rounded-lg text-xs text-gray-700 space-y-1">
                    <p className="font-semibold text-[#DD7230]">✨ Privileges Granted:</p>
                    <p className="text-[11px] text-gray-600">
                      Grants campus-wide audit review permissions, internal quality audit assessment rights, and access to evaluate ISO non-conformities across all campus offices.
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-end gap-2">
                  <button 
                    onClick={() => { setShowOfficerModal(false); setUserForOfficerToggle(null); }} 
                    disabled={isTogglingOfficer} 
                    className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executeToggleOfficer} 
                    disabled={isTogglingOfficer} 
                    className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg bg-[#DD7230] hover:bg-[#c66224] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {isTogglingOfficer ? <><Loader2 className="h-3.5 w-3.5 animate-spin"/> Granting...</> : "Grant Officer Status"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
