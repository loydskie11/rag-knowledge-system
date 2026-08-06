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
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-bold z-[100] transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
          toast.type === 'success' ? 'bg-[#E6F7ED] text-[#006837] border-2 border-[#006837]/20' : 'bg-red-50 text-red-700 border-2 border-red-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2">Users & Roles</h1>
          <p className="text-gray-600">Manage user accounts, roles, and access status</p>
        </div>
        <button
          onClick={() => setShowAddUserModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#FF9501] text-white rounded-lg hover:bg-[#D97E00] transition-colors shadow-sm cursor-pointer active:scale-95"
        >
          <UserPlus className="h-5 w-5" />
          Add User
        </button>
      </div>

      {/* Role Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roleStats.map((role) => (
          <div key={role.role} className="bg-white rounded-xl shadow-sm p-6 border-t-4" style={{ borderColor: role.color }}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{role.role}</h3>
            <div className="text-4xl font-bold mb-2" style={{ color: role.color }}>{role.userCount}</div>
            <p className="text-sm text-gray-500 font-medium">Registered accounts</p>
          </div>
        ))}
      </div>

      {/* Pending Faculty */}
      {pendingFaculty.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-[#FDB913] overflow-hidden">
          <div className="bg-[#FDB913]/10 p-5 border-b border-gray-100 flex items-center gap-3">
            <Clock className="h-6 w-6 text-[#FDB913]" />
            <h2 className="text-lg font-bold text-gray-900">Pending Faculty Approvals ({pendingFaculty.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F9FAFB] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Registration Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingFaculty.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{user.full_name || "N/A"}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{user.email}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleApprove(user.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 font-semibold text-xs rounded border border-green-200 hover:bg-green-100 transition-colors cursor-pointer">
                          <CheckCircle className="h-4 w-4" /> Approve
                        </button>
                        <button onClick={() => { setUserToReject(user); setShowRejectModal(true); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 font-semibold text-xs rounded hover:bg-red-100 transition-colors cursor-pointer">
                          <XCircle className="h-4 w-4" /> Reject
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-[#F9FAFB]">
          <h2 className="text-xl font-bold text-gray-900 mb-4">User Directory</h2>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9501]" 
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)} 
                className="sm:w-40 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer hover:bg-gray-50"
              >
                <option value="all">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="FACULTY">Faculty</option>
                <option value="STUDENT">Student</option>
              </select>

              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)} 
                className="sm:w-40 px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer hover:bg-gray-50"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F5F7FA] border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ISO Admin Office</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">No users found matching your filters.</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-900 font-bold">{user.full_name || "N/A"}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${
                        user.role === 'ADMIN' ? 'bg-[#FFF4E5] text-[#FF9501] border-[#FF9501]/30' : 
                        user.role === 'FACULTY' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                        'bg-green-50 text-[#006837] border-green-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                        user.administrative_office 
                          ? 'bg-orange-50 text-[#D97E00] border-[#FF9501]/30'
                          : 'bg-gray-50 text-gray-400 border-gray-200 font-normal'
                      }`}>
                        {user.administrative_office || "Academic Only"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        (user.status || 'Active') === 'Active' 
                        ? 'bg-green-50 border-green-200 text-green-700' 
                        : 'bg-gray-100 border-gray-200 text-gray-500'
                      }`}>
                        {user.status || "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center flex items-center justify-center gap-1">
                      <button
                        onClick={() => { setEditingUser({ ...user }); setShowEditUserModal(true); }}
                        className="px-2.5 py-1 text-xs font-bold text-[#FF9501] bg-orange-50 hover:bg-orange-100 border border-[#FF9501]/30 rounded-lg transition-colors cursor-pointer"
                        title="Edit User & Office Assignment"
                      >
                        Edit Office
                      </button>
                      {user.role !== 'ADMIN' && (
                        (user.status || 'Active') === 'Active' ? (
                          <button 
                            onClick={() => { setUserToDisable(user); setShowDisableModal(true); }} 
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" 
                            title="Disable Account"
                          >
                            <Ban className="h-5 w-5" />
                          </button>
                        ) : (
                          <button 
                            onClick={() => { setUserToEnable(user); setShowEnableModal(true); }} 
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer" 
                            title="Re-enable Account"
                          >
                            <Unlock className="h-5 w-5" />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD USER MODAL --- */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F5F7FA]">
              <h2 className="text-xl font-bold text-[#1F2937]">Create User Account</h2>
              <button onClick={() => setShowAddUserModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                <input type="text" name="name" value={addUserData.name} onChange={handleAddUserChange} className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9501]" placeholder="e.g., Jane Doe" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                <input type="email" name="email" value={addUserData.email} onChange={handleAddUserChange} className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9501]" placeholder="jane.doe@ctu.edu.ph" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">System Role</label>
                <select name="role" value={addUserData.role} onChange={handleAddUserChange} className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer">
                  <option value="" disabled>Select User Role</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>

              {addUserData.role !== "STUDENT" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Administrative Office (ISO Matrix Decoupled)</label>
                  <select 
                    name="administrative_office" 
                    value={addUserData.administrative_office} 
                    onChange={handleAddUserChange} 
                    className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer"
                  >
                    <option value="">None / Unassigned (Academic Only)</option>
                    {ISO_OFFICES_16.map((off) => (
                      <option key={off} value={off}>{off}</option>
                    ))}
                  </select>
                </div>
              )}

              {addUserData.role === "FACULTY" && (
                <div className="flex items-center gap-3 p-3 bg-orange-50/70 border border-[#FF9501]/30 rounded-xl">
                  <input
                    type="checkbox"
                    id="add_is_iqa_auditor"
                    checked={addUserData.is_iqa_auditor}
                    onChange={(e) => setAddUserData({ ...addUserData, is_iqa_auditor: e.target.checked })}
                    className="h-4 w-4 text-[#FF9501] focus:ring-[#FF9501] border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="add_is_iqa_auditor" className="text-xs font-bold text-gray-800 cursor-pointer">
                    Designate as Internal Quality Auditor (IQA Auditor) — Grants Campus-Wide Audit Access
                  </label>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Temporary Password</label>
                <input type="password" name="password" value={addUserData.password} onChange={handleAddUserChange} className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9501]" placeholder="Enter secure password" />
              </div>
            
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="flex-1 px-5 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isCreating} className="flex-1 px-5 py-3 text-sm font-bold bg-[#FF9501] text-white rounded-xl hover:bg-[#D97E00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
                   {isCreating ? <><Loader2 className="h-4 w-4 animate-spin"/> Creating...</> : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT USER & OFFICE ASSIGNMENT MODAL --- */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F5F7FA]">
              <h2 className="text-xl font-bold text-[#1F2937]">Edit User & Office Assignment</h2>
              <button onClick={() => setShowEditUserModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleEditUserSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={editingUser.full_name || ""} 
                  onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })} 
                  className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9501]" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={editingUser.email || ""} 
                  disabled 
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed" 
                />
              </div>

              {editingUser.role !== "STUDENT" && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Administrative Office (Decoupled ISO Matrix)</label>
                  <select 
                    value={editingUser.administrative_office || ""} 
                    onChange={(e) => setEditingUser({ ...editingUser, administrative_office: e.target.value })} 
                    className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF9501] cursor-pointer"
                  >
                    <option value="">None / Unassigned (Academic Only)</option>
                    {ISO_OFFICES_16.map((off) => (
                      <option key={off} value={off}>{off}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Assigning an office will automatically default their ISO Audit Dashboard to that office.</p>
                </div>
              )}

              {editingUser.role === "FACULTY" && (
                <div className="flex items-center gap-3 p-3 bg-orange-50/70 border border-[#FF9501]/30 rounded-xl">
                  <input
                    type="checkbox"
                    id="edit_is_iqa_auditor"
                    checked={Boolean(editingUser.is_iqa_auditor)}
                    onChange={(e) => setEditingUser({ ...editingUser, is_iqa_auditor: e.target.checked })}
                    className="h-4 w-4 text-[#FF9501] focus:ring-[#FF9501] border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="edit_is_iqa_auditor" className="text-xs font-bold text-gray-800 cursor-pointer">
                    Designate as Internal Quality Auditor (IQA Auditor) — Grants Campus-Wide Audit Access
                  </label>
                </div>
              )}
            
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowEditUserModal(false)} className="flex-1 px-5 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isUpdatingUser} className="flex-1 px-5 py-3 text-sm font-bold bg-[#FF9501] text-white rounded-xl hover:bg-[#D97E00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
                   {isUpdatingUser ? <><Loader2 className="h-4 w-4 animate-spin"/> Saving...</> : "Save Office Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DISABLE ACCOUNT MODAL --- */}
      {showDisableModal && userToDisable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-red-100 bg-red-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-6 w-6 text-red-600" />
                <h2 className="text-xl font-bold text-red-700">Disable Account</h2>
              </div>
              <button onClick={() => setShowDisableModal(false)} className="p-2 hover:bg-red-100 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-red-700" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                You are about to disable the account for <span className="font-bold text-gray-900">{userToDisable.full_name} ({userToDisable.email})</span>.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                They will immediately lose access to log into the system. However, any documents or evidence they previously uploaded will remain intact for audit purposes.
              </p>
            </div>

            <div className="p-6 border-t border-gray-100 bg-[#F9FAFB] flex justify-end gap-3">
              <button onClick={() => setShowDisableModal(false)} disabled={isDisabling} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={executeDisable} disabled={isDisabling} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
                {isDisabling ? <><Loader2 className="h-4 w-4 animate-spin"/> Disabling...</> : "Yes, Disable Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ENABLE ACCOUNT MODAL --- */}
      {showEnableModal && userToEnable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-green-100 bg-green-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Unlock className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-bold text-green-700">Re-enable Account</h2>
              </div>
              <button onClick={() => setShowEnableModal(false)} className="p-2 hover:bg-green-100 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-green-700" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                You are about to restore login access for <span className="font-bold text-gray-900">{userToEnable.full_name} ({userToEnable.email})</span>.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                They will immediately be able to log back into the dashboard using their existing password.
              </p>
            </div>

            <div className="p-6 border-t border-gray-100 bg-[#F9FAFB] flex justify-end gap-3">
              <button onClick={() => setShowEnableModal(false)} disabled={isEnabling} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={executeEnable} disabled={isEnabling} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
                {isEnabling ? <><Loader2 className="h-4 w-4 animate-spin"/> Enabling...</> : "Yes, Re-enable"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REJECT PENDING ACCOUNT MODAL --- */}
      {showRejectModal && userToReject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-red-100 bg-red-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <UserX className="h-6 w-6 text-red-600" />
                <h2 className="text-xl font-bold text-red-700">Reject Registration</h2>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="p-2 hover:bg-red-100 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-red-700" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                Are you sure you want to reject the faculty registration for <span className="font-bold text-gray-900">{userToReject.email}</span>?
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Since this account was never approved, this action will permanently delete their request from the system.
              </p>
            </div>

            <div className="p-6 border-t border-gray-100 bg-[#F9FAFB] flex justify-end gap-3">
              <button onClick={() => setShowRejectModal(false)} disabled={isRejecting} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={executeReject} disabled={isRejecting} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer">
                {isRejecting ? <><Loader2 className="h-4 w-4 animate-spin"/> Rejecting...</> : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}