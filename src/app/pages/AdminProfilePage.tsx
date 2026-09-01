import { useState } from "react";
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LifeBuoy,
} from "lucide-react";

type Tab = "profile" | "security" | "recovery";

export function AdminProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saved, setSaved] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState({
    fullName: "Admin User",
    email: "admin@ctu.edu.ph",
    role: "Administrator",
    department: "Office of the Campus Administrator",
  });

  // Recovery email state
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [confirmRecoveryEmail, setConfirmRecoveryEmail] = useState("");
  const [recoverySaved, setRecoverySaved] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [existingRecoveryEmail, setExistingRecoveryEmail] = useState("");

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleRecoverySave = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    if (!recoveryEmail.includes("@")) {
      setRecoveryError("Please enter a valid email address.");
      return;
    }
    if (recoveryEmail !== confirmRecoveryEmail) {
      setRecoveryError("Recovery emails do not match.");
      return;
    }
    if (recoveryEmail === profileData.email) {
      setRecoveryError("Recovery email must be different from your CTU email.");
      return;
    }
    setExistingRecoveryEmail(recoveryEmail);
    setRecoveryEmail("");
    setConfirmRecoveryEmail("");
    setRecoverySaved(true);
    setTimeout(() => setRecoverySaved(false), 3000);
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (passwordData.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 3000);
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "profile", label: "My Profile", icon: User },
    { key: "security", label: "Change Password", icon: KeyRound },
    { key: "recovery", label: "Recovery Email", icon: LifeBuoy },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1F2937]">My Profile</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          Manage your account details, password, and recovery options.
        </p>
      </div>

      {/* Avatar Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 flex items-center gap-5 shadow-2xs">
        <div className="w-16 h-16 rounded-full bg-[#FF9501] flex items-center justify-center text-white text-xl font-bold flex-shrink-0 shadow-2xs">
          AU
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{profileData.fullName}</p>
          <p className="text-xs text-gray-500">{profileData.email}</p>
          <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-[#D97E00] border border-[#FF9501]/20">
            <Shield className="h-3 w-3" />
            {profileData.role}
          </span>
        </div>
        {existingRecoveryEmail && (
          <div className="ml-auto flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-800">Recovery email set</p>
              <p className="text-[11px] text-emerald-600">{existingRecoveryEmail}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-gray-100/80 rounded-xl p-1 mb-6 border border-gray-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === key
                ? "bg-white text-[#D97E00] shadow-2xs border border-gray-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Profile */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs">
          <h2 className="text-sm font-bold text-gray-900 mb-5">Account Information</h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="fullName"
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  placeholder="Full Name"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF9501] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-700">CTU Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={profileData.email}
                  disabled
                  placeholder="CTU Email Address"
                  title="CTU Email Address"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-700">Department</label>
              <input
                id="department"
                type="text"
                value={profileData.department}
                onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                placeholder="Department"
                className="w-full px-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF9501] focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-700">Role</label>
              <div className="relative">
                <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="role"
                  type="text"
                  value={profileData.role}
                  disabled
                  placeholder="Role"
                  title="Role"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FF9501] text-white rounded-xl hover:bg-[#D97E00] transition-colors text-xs font-semibold shadow-2xs cursor-pointer active:scale-98"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
              {saved && (
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Profile saved successfully!
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tab: Change Password */}
      {activeTab === "security" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Change Password</h2>
          <p className="text-xs text-gray-500 mb-5">Choose a strong password to keep your account secure.</p>

          {passwordError && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs mb-4 font-medium">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordSave} className="space-y-4">
            {[
              { id: "current", label: "Current Password", key: "currentPassword" as const },
              { id: "new", label: "New Password", key: "newPassword" as const },
              { id: "confirm", label: "Confirm New Password", key: "confirmPassword" as const },
            ].map(({ id, label, key }) => (
              <div key={id}>
                <label className="block text-xs font-semibold mb-1.5 text-gray-700">{label}</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type={showPasswords[id as keyof typeof showPasswords] ? "text" : "password"}
                    required
                    value={passwordData[key]}
                    onChange={(e) => {
                      setPasswordError("");
                      setPasswordData({ ...passwordData, [key]: e.target.value });
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF9501] focus:bg-white transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords({
                        ...showPasswords,
                        [id]: !showPasswords[id as keyof typeof showPasswords],
                      })
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    {showPasswords[id as keyof typeof showPasswords]
                      ? <EyeOff className="h-4 w-4" />
                      : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FF9501] text-white rounded-xl hover:bg-[#D97E00] transition-colors text-xs font-semibold shadow-2xs cursor-pointer active:scale-98"
              >
                <Save className="h-4 w-4" />
                Update Password
              </button>
              {passwordSaved && (
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Password updated successfully!
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Tab: Recovery Email */}
      {activeTab === "recovery" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs">
          <h2 className="text-sm font-bold text-gray-900 mb-1">Recovery Email</h2>
          <p className="text-xs text-gray-500 mb-3">
            Set a personal recovery email (e.g. Gmail) so you can still reset your password
            if you ever get locked out of your CTU account.
          </p>

          {/* Info box explaining why this matters */}
          <div className="flex items-start gap-3 bg-orange-50 border border-[#FF9501]/20 rounded-xl p-4 mb-5">
            <LifeBuoy className="h-5 w-5 text-[#D97E00] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">Why is this important?</p>
              <p className="text-gray-600 leading-relaxed">
                Admin accounts are pre-created by the system. If you forget your password and lose access
                to your CTU email, your recovery email is the only way to regain entry. 
                Set it now before it's too late!
              </p>
            </div>
          </div>

          {existingRecoveryEmail && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 mb-5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-800">Recovery email is set</p>
                <p className="text-xs text-emerald-600">{existingRecoveryEmail}</p>
              </div>
              <button
                onClick={() => setExistingRecoveryEmail("")}
                className="ml-auto text-xs text-emerald-700 underline hover:text-emerald-900 cursor-pointer"
              >
                Change
              </button>
            </div>
          )}

          {recoveryError && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs mb-4 font-medium">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {recoveryError}
            </div>
          )}

          <form onSubmit={handleRecoverySave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-700">
                Recovery Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={recoveryEmail}
                  onChange={(e) => { setRecoveryError(""); setRecoveryEmail(e.target.value); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF9501] focus:bg-white transition-all"
                  placeholder="yourpersonal@gmail.com"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Use a personal email you always have access to, not your CTU email.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 text-gray-700">
                Confirm Recovery Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={confirmRecoveryEmail}
                  onChange={(e) => { setRecoveryError(""); setConfirmRecoveryEmail(e.target.value); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF9501] focus:bg-white transition-all"
                  placeholder="yourpersonal@gmail.com"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#FF9501] text-white rounded-xl hover:bg-[#D97E00] transition-colors text-xs font-semibold shadow-2xs cursor-pointer active:scale-98"
              >
                <Save className="h-4 w-4" />
                Save Recovery Email
              </button>
              {recoverySaved && (
                <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Recovery email saved!
                </div>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}