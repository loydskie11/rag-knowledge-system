import { useState, useEffect } from "react";
import { Search, UserPlus, Ban, UserX, CheckCircle, Clock, XCircle, AlertCircle, X, ShieldAlert, Unlock, Loader2 } from "lucide-react";
import axios from "axios";

export const ISO_OFFICES_16 = [
  "Finance/Budget/Accounting/Cashier",
  "Student Affairs Services",
  "Registrar/MIS",
  "HRMO",
  "Document Controller",
  "Management/Leadership",
  "Educational Delivery Processes",
  "Maintenance/General Services",
  "Research and Development",
  "Extension",
  "Production and Resource Generation",
  "Library Services",
  "Procurement/BAC",
  "Supply/Property Custodian",
  "DRRM",
  "Gender and Development"
];

export function UsersRoles() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // --- TOAST NOTIFICATIONS ---
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- MODAL STATES ---
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [addUserData, setAddUserData] = useState({ name: "", email: "", role: "", password: "", administrative_office: "", is_iqa_auditor: false });

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

  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://localhost:8000/users");
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
      await axios.put(`http://localhost:8000/users/${userId}/verify`);
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
      await axios.delete(`http://localhost:8000/users/${userToReject.id}`);
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
      await axios.put(`http://localhost:8000/users/${userToDisable.id}/disable`);
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
      await axios.put(`http://localhost:8000/users/${userToEnable.id}/enable`);
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
    setAddUserData({ ...addUserData, [e.target.name]: e.target.value });
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserData.name || !addUserData.email || !addUserData.role || !addUserData.password) {
      showToast("Please fill out all required fields.", "error");
      return;
    }
    setIsCreating(true);
    try {
      await axios.post("http://localhost:8000/users", {
        full_name: addUserData.name,
        email: addUserData.email,
        role: addUserData.role,
        password: addUserData.password,
        administrative_office: addUserData.administrative_office || null,
        is_iqa_auditor: addUserData.is_iqa_auditor
      });

      showToast(`${addUserData.role} ${addUserData.name} created successfully!`, "success");
      setShowAddUserModal(false);
      setAddUserData({ name: "", email: "", role: "", password: "", administrative_office: "", is_iqa_auditor: false });
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
      await axios.put("http://localhost:8000/users/profile", {
        email: editingUser.email,
        new_email: editingUser.email,
        full_name: editingUser.full_name,
        program: editingUser.department || "BSIT",
        administrative_office: editingUser.administrative_office || null
      });

      if (editingUser.id) {
        await axios.put(`http://localhost:8000/users/${editingUser.id}/details`, {
          administrative_office: editingUser.administrative_office || null,
          is_iqa_auditor: Boolean(editingUser.is_iqa_auditor)
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

  const pendingFaculty = users.filter(u => u.role === "FACULTY" && !u.is_verified);
  const registeredUsers = users.filter(u => u.is_verified || u.role === "ADMIN");

  const filteredUsers = registeredUsers.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const matchesName = user.full_name?.toLowerCase().includes(searchLower) || false;
    const matchesEmail = user.email?.toLowerCase().includes(searchLower) || false;
    const matchesSearch = matchesName || matchesEmail;
    
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    
    const userStatus = user.status || "Active";
    const matchesStatus = selectedStatus === "all" || userStatus === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const roleStats = [
    { role: "Administrator", userCount: users.filter(u => u.role === "ADMIN").length, color: "#FF9501" },
    { role: "Faculty", userCount: users.filter(u => u.role === "FACULTY").length, color: "#FDB913" },
    { role: "Student", userCount: users.filter(u => u.role === "STUDENT").length, color: "#006837" }
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF9501]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      
      {/* --- TOAST NOTIFICATION --- */}
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Users & Roles</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage user accounts, system roles, and office assignments</p>
        </div>
        <button
          onClick={() => setShowAddUserModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FF9501] text-white text-xs font-semibold rounded-lg hover:bg-[#D97E00] transition-all shadow-2xs cursor-pointer active:scale-95 self-start sm:self-auto"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Role Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roleStats.map((role) => (
          <div key={role.role} className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-700">{role.role}</span>
              <span className="text-[10px] font-medium text-gray-400">Total Accounts</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">{role.userCount}</div>
            <p className="text-[11px] text-gray-500 mt-1">Registered users</p>
          </div>
        ))}
      </div>

      {/* Pending Faculty */}
      {pendingFaculty.length > 0 && (
        <div className="bg-white rounded-xl shadow-2xs border border-amber-200/80 overflow-hidden">
          <div className="bg-amber-50/60 p-4 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h2 className="text-xs font-semibold text-gray-900">Pending Faculty Approvals</h2>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded-full">
              {pendingFaculty.length} awaiting review
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Registration Date</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/70">
                {pendingFaculty.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-900">{user.full_name || "N/A"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{user.email}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleApprove(user.id)} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-medium text-xs rounded-lg border border-emerald-200/60 hover:bg-emerald-100 transition-colors cursor-pointer">
                          <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button onClick={() => { setUserToReject(user); setShowRejectModal(true); }} className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200/60 text-rose-700 font-medium text-xs rounded-lg hover:bg-rose-100 transition-colors cursor-pointer">
                          <XCircle className="h-3.5 w-3.5" /> Reject
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
                placeholder="Search by name or email..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-9 pr-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] transition-colors" 
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2.5">
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)} 
                className="sm:w-40 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] text-gray-700 cursor-pointer transition-colors"
              >
                <option value="all">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="FACULTY">Faculty</option>
                <option value="STUDENT">Student</option>
              </select>

              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)} 
                className="sm:w-40 px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] text-gray-700 cursor-pointer transition-colors"
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
                  <th className="px-4 py-3">Role</th>
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
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                          user.role === 'ADMIN' ? 'bg-orange-50 text-[#D97E00] border-[#FF9501]/30' : 
                          user.role === 'FACULTY' ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 
                          'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.role === 'STUDENT' ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${
                            user.administrative_office 
                              ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {user.administrative_office || "Academic Only"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          (user.status || 'Active') === 'Active' 
                          ? 'bg-emerald-50 border-emerald-200/60 text-emerald-700' 
                          : 'bg-gray-100 border-gray-200 text-gray-500'
                        }`}>
                          {user.status || "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {user.role !== 'STUDENT' && (
                            <button
                              onClick={() => { setEditingUser({ ...user }); setShowEditUserModal(true); }}
                              className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                              title="Edit User & Office Assignment"
                            >
                              Edit Office
                            </button>
                          )}
                          {user.role !== 'ADMIN' && (
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
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xs font-semibold text-gray-900">Create User Account</h2>
                <p className="text-[11px] text-gray-500">Add a new user and assign institutional role</p>
              </div>
              <button onClick={() => setShowAddUserModal(false)} className="p-1 hover:bg-gray-200 rounded-md transition-colors cursor-pointer text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddUserSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
                <input type="text" name="name" value={addUserData.name} onChange={handleAddUserChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501]" placeholder="e.g., Jane Doe" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address</label>
                <input type="email" name="email" value={addUserData.email} onChange={handleAddUserChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501]" placeholder="jane.doe@ctu.edu.ph" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">System Role</label>
                <select name="role" value={addUserData.role} onChange={handleAddUserChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer">
                  <option value="" disabled>Select User Role</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>

              {addUserData.role !== "STUDENT" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Administrative Office (ISO Matrix)</label>
                  <select 
                    name="administrative_office" 
                    value={addUserData.administrative_office} 
                    onChange={handleAddUserChange} 
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer"
                  >
                    <option value="">None / Unassigned (Academic Only)</option>
                    {ISO_OFFICES_16.map((off) => (
                      <option key={off} value={off}>{off}</option>
                    ))}
                  </select>
                </div>
              )}

              {addUserData.role === "FACULTY" && (
                <div className="flex items-start gap-2.5 p-2.5 bg-orange-50/50 border border-[#FF9501]/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="add_is_iqa_auditor"
                    checked={addUserData.is_iqa_auditor}
                    onChange={(e) => setAddUserData({ ...addUserData, is_iqa_auditor: e.target.checked })}
                    className="h-3.5 w-3.5 mt-0.5 text-[#FF9501] focus:ring-[#FF9501] border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="add_is_iqa_auditor" className="text-xs text-gray-700 font-medium cursor-pointer">
                    Designate as Internal Quality Auditor (IQA Auditor) — Campus-wide audit access
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Temporary Password</label>
                <input type="password" name="password" value={addUserData.password} onChange={handleAddUserChange} className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501]" placeholder="Enter secure password" />
              </div>
            
              <div className="pt-2 flex gap-2 justify-end border-t border-gray-200">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating} className="px-4 py-1.5 text-xs font-semibold bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs">
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
          <div className="bg-white rounded-xl max-w-lg w-full shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xs font-semibold text-gray-900">Edit User & Office Assignment</h2>
                <p className="text-[11px] text-gray-500">Update metadata and administrative permissions</p>
              </div>
              <button onClick={() => setShowEditUserModal(false)} className="p-1 hover:bg-gray-200 rounded-md transition-colors cursor-pointer text-gray-500">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleEditUserSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={editingUser.full_name || ""} 
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })} 
                  className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501]" 
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={editingUser.email || ""} 
                  disabled 
                  className="w-full px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-400 cursor-not-allowed" 
                />
              </div>

              {editingUser.role !== "STUDENT" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Administrative Office (ISO Matrix)</label>
                  <select 
                    value={editingUser.administrative_office || ""} 
                    onChange={(e) => setEditingUser({ ...editingUser, administrative_office: e.target.value })} 
                    className="w-full px-3 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer"
                  >
                    <option value="">None / Unassigned (Academic Only)</option>
                    {ISO_OFFICES_16.map((off) => (
                      <option key={off} value={off}>{off}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Assigning an office defaults their ISO audit dashboard to that office.</p>
                </div>
              )}

              {editingUser.role === "FACULTY" && (
                <div className="flex items-start gap-2.5 p-2.5 bg-orange-50/50 border border-[#FF9501]/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="edit_is_iqa_auditor"
                    checked={Boolean(editingUser.is_iqa_auditor)}
                    onChange={(e) => setEditingUser({ ...editingUser, is_iqa_auditor: e.target.checked })}
                    className="h-3.5 w-3.5 mt-0.5 text-[#FF9501] focus:ring-[#FF9501] border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="edit_is_iqa_auditor" className="text-xs text-gray-700 font-medium cursor-pointer">
                    Designate as Internal Quality Auditor (IQA Auditor) — Campus-wide audit access
                  </label>
                </div>
              )}
            
              <div className="pt-2 flex gap-2 justify-end border-t border-gray-200">
                <button type="button" onClick={() => setShowEditUserModal(false)} className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isUpdatingUser} className="px-4 py-1.5 text-xs font-semibold bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs">
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

    </div>
  );
}