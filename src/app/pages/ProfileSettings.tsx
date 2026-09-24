import { useState, useEffect } from "react";
import {
  User, Lock, Shield, CheckCircle, AlertCircle, Loader2, Mail, BookOpen,
  LogOut, Eye, EyeOff, Check, X, GraduationCap, KeyRound, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router";
import { apiClient } from "../api/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

const academicPrograms = [
  {
    college: "College of Education (COEd)",
    programs: [
      { value: "BEED", label: "Bachelor of Elementary Education" },
      { value: "BSED_MATH", label: "BSEd major in Mathematics" },
      { value: "BSED_ENGLISH", label: "BSEd major in English" },
      { value: "BTLED_HE", label: "BTLEd major in Home Economics" },
    ],
  },
  {
    college: "College of Arts and Sciences (CAS)",
    programs: [
      { value: "AB_ELS", label: "BA in English Language Studies" },
      { value: "AB_LIT", label: "BA in Literature" },
      { value: "AB_PSYCH", label: "BA in Psychology" },
    ],
  },
  {
    college: "College of Agriculture, Forestry, & Environmental Science (CAFES)",
    programs: [
      { value: "BSF", label: "Bachelor of Science in Forestry (BSF)" },
      { value: "BSA", label: "Bachelor of Science in Agriculture (BSA)" },
      { value: "BSES", label: "Bachelor of Science in Environmental Science (BSES)" },
    ],
  },
  {
    college: "College of Technology and Engineering (COTE)",
    programs: [
      { value: "BSIE", label: "BS in Industrial Engineering" },
      { value: "BSIT", label: "BS in Information Technology" },
      { value: "BIT_AT", label: "BIT major in Automotive Technology (BIT-AT)" },
      { value: "BIT_CT", label: "BIT major in Computer Technology (BIT-CT)" },
      { value: "BIT_DT", label: "BIT major in Drafting Technology (BIT-DT)" },
      { value: "BIT_ET", label: "BIT major in Electronics Technology (BIT-ET)" },
      { value: "BIT_GT", label: "BIT major in Garments Technology (BIT-GT)" },
    ],
  },
  {
    college: "College of Hospitality and Tourism Management (CHTM)",
    programs: [
      { value: "BSHM", label: "Bachelor of Science in Hospitality Management (BSHM)" },
      { value: "BSTM", label: "Bachelor of Science in Tourism Management (BSTM)" },
    ],
  },
];

export function ProfileSettings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);


  const userRole = sessionStorage.getItem("userRole") || "STUDENT";
  const originalEmail = sessionStorage.getItem("userEmail") || "";

  const [profileData, setProfileData] = useState({
    fullName: sessionStorage.getItem("userName") || "",
    program: sessionStorage.getItem("userDepartment") || "",
    email: originalEmail,
  });

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState<number | null>(null);
  const [modalContent, setModalContent] = useState({ title: "", message: "" });

  const hasProfileChanges = 
    profileData.fullName !== (sessionStorage.getItem("userName") || "") || 
    profileData.program !== (sessionStorage.getItem("userDepartment") || "") ||
    profileData.email !== originalEmail;

  const hasPasswordChanges = passwords.current !== "" || passwords.new !== "" || passwords.confirm !== "";

  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    if (activeTab === "profile" && hasProfileChanges) {
      setPendingTab(newTab);
      setShowUnsavedModal(true);
      return;
    }
    if (activeTab === "security" && hasPasswordChanges) {
      setPendingTab(newTab);
      setShowUnsavedModal(true);
      return;
    }
    setActiveTab(newTab);
  };

  const handleDiscardChanges = () => {
    if (activeTab === "profile") {
      setProfileData({
        fullName: sessionStorage.getItem("userName") || "",
        program: sessionStorage.getItem("userDepartment") || "",
        email: originalEmail,
      });
      setProfileStatus(null);
    } else {
      setPasswords({ current: "", new: "", confirm: "" });
      setPasswordStatus(null);
    }
    setShowUnsavedModal(false);
    if (pendingTab) setActiveTab(pendingTab);
    setPendingTab(null);
  };

  const handleSaveFromModal = () => {
    setShowUnsavedModal(false);
    if (activeTab === "profile") {
      handleProfileUpdate();
    } else {
      handlePasswordChange();
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (logoutCountdown !== null && logoutCountdown > 0) {
      timer = setTimeout(() => setLogoutCountdown(logoutCountdown - 1), 1000);
    } else if (logoutCountdown === 0) {
      handleForceLogout();
    }
    return () => clearTimeout(timer);
  }, [logoutCountdown]);

  useEffect(() => {
    let interval: any;
    if (otpCountdown > 0) {
      interval = setInterval(() => setOtpCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpCountdown]);

  const handleForceLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setProfileStatus(null);
    try {
      await apiClient.post("/auth/send-otp", { email: profileData.email });
      setOtpSent(true);
      setOtpCountdown(60);
    } catch (error: any) {
      setProfileStatus({ type: "error", msg: error.response?.data?.detail || "Failed to send verification code." });
      setShowOtpModal(false);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleProfileUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setProfileStatus(null);

    if (profileData.email !== originalEmail && !showOtpModal) {
      setShowOtpModal(true);
      if (!otpSent) {
        handleSendOtp();
      }
      return;
    }

    submitProfileUpdate();
  };

  const submitProfileUpdate = async () => {
    setIsUpdatingProfile(true);
    try {
      const payload: any = {
        email: originalEmail,
        new_email: profileData.email,
        full_name: profileData.fullName,
        program: userRole === "ADMIN" ? "ADMIN" : profileData.program,
      };
      
      if (profileData.email !== originalEmail) {
        payload.otp_code = otpCode;
      }

      const response = await apiClient.put("/users/profile", payload);

      sessionStorage.setItem("userName", response.data.full_name);
      sessionStorage.setItem("userDepartment", response.data.program);

      setShowOtpModal(false);
      
      if (response.data.email !== originalEmail) {
        sessionStorage.setItem("userEmail", response.data.email);
        setModalContent({
          title: "Email Address Updated!",
          message: "You have successfully verified and changed your email. For your security, please sign in again.",
        });
        setLogoutCountdown(5);
      } else {
        setProfileStatus({ type: "success", msg: "Profile information updated successfully." });
      }
    } catch (error: any) {
      if (showOtpModal) {
        setProfileStatus({ type: "error", msg: error.response?.data?.detail || "Invalid OTP code." });
      } else {
        setProfileStatus({ type: "error", msg: error.response?.data?.detail || "Failed to update profile." });
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const validatePassword = (password: string) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  };

  const passValidation = validatePassword(passwords.new);
  const isPasswordValid = passValidation.length && passValidation.uppercase && passValidation.number && passValidation.special;

  const handlePasswordChange = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPasswordStatus(null);

    if (passwords.new !== passwords.confirm) {
      setPasswordStatus({ type: "error", msg: "New passwords do not match." });
      return;
    }

    if (!isPasswordValid) {
      setPasswordStatus({ type: "error", msg: "Please meet all password requirements." });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await apiClient.post("/users/change-password", {
        email: sessionStorage.getItem("userEmail"),
        current_password: passwords.current,
        new_password: passwords.new,
      });

      setModalContent({
        title: "Password Changed!",
        message: "You have successfully changed your password. For your security, you must sign in again with your new credentials.",
      });
      setLogoutCountdown(5);
    } catch (error: any) {
      setPasswordStatus({ type: "error", msg: error.response?.data?.detail || "Incorrect current password." });
      setIsUpdatingPassword(false);
    }
  };

  const isAdmin = userRole === "ADMIN";

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl sm:text-lg font-bold text-gray-900">Account Settings</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage your personal information, academic details, and account security.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex w-full sm:w-fit overflow-x-auto bg-gray-100/80 p-1 rounded-xl gap-1 no-scrollbar border border-gray-200">
          <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs text-gray-600 font-medium cursor-pointer transition-all text-xs sm:text-sm whitespace-nowrap flex-1 sm:px-6">
            <User className="h-4 w-4 mr-2 inline-block" /> Profile Details
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs text-gray-600 font-medium cursor-pointer transition-all text-xs sm:text-sm whitespace-nowrap flex-1 sm:px-6">
            <Lock className="h-4 w-4 mr-2 inline-block" /> Security & Password
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" forceMount className={activeTab === 'profile' ? 'space-y-6 mt-6 animate-in fade-in' : 'hidden'}>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DD7230]/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#dd7230]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Personal Information</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update your account and academic information.</p>
              </div>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="p-6 sm:p-7">
              {profileStatus && !showOtpModal && (
                <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${profileStatus.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                  <div className={`mt-0.5 ${profileStatus.type === "success" ? "text-green-500" : "text-red-500"}`}>
                    {profileStatus.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-semibold">{profileStatus.type === "success" ? "Changes saved" : "Something went wrong"}</p>
                    <p className="text-xs mt-0.5 opacity-80">{profileStatus.msg}</p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input type="text" required value={profileData.fullName} onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} placeholder="Enter your full name" className="w-full h-9 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#dd7230] focus:ring-4 focus:ring-[#dd7230]/10 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input type="email" required value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} placeholder="Enter your email" className="w-full h-9 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#dd7230] focus:ring-4 focus:ring-[#dd7230]/10 transition-all" />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">Changing your email requires OTP verification.</p>
                  </div>
                </div>

                {isAdmin ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">System Role</label>
                    <div className="relative">
                      <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value="ADMINISTRATOR" disabled className="w-full h-9 pl-10 pr-4 bg-gray-100 border border-gray-200 text-gray-500 rounded-lg text-xs cursor-not-allowed" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Course / Program</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                      <select required value={profileData.program} onChange={(e) => setProfileData({ ...profileData, program: e.target.value })} className="appearance-none w-full h-9 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:bg-white focus:border-[#dd7230] focus:ring-4 focus:ring-[#dd7230]/10 transition-all cursor-pointer">
                        <option value="" disabled>Select your academic program</option>
                        {academicPrograms.map((college, cIdx) => (
                          <optgroup key={cIdx} label={college.college}>
                            {college.programs.map((prog, pIdx) => <option key={pIdx} value={prog.value}>{prog.label}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-xs text-gray-400">Make sure your information is accurate before saving.</p>
                <button type="submit" disabled={isUpdatingProfile} className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-[#dd7230] text-white text-xs font-semibold rounded-lg hover:bg-[#b8591f] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:shadow-orange-100 active:scale-[0.98] cursor-pointer">
                  {isUpdatingProfile ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="security" forceMount className={activeTab === 'security' ? 'space-y-6 mt-6 animate-in fade-in' : 'hidden'}>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#DD7230]/10 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-[#dd7230]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Account Security</h3>
                <p className="text-xs text-gray-500 mt-0.5">Protect your account by keeping your password secure.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="p-6 sm:p-7">
              {passwordStatus && (
                <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${passwordStatus.type === "success" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                  <div className={`mt-0.5 ${passwordStatus.type === "success" ? "text-green-500" : "text-red-500"}`}>
                    {passwordStatus.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-semibold">{passwordStatus.type === "success" ? "Password updated" : "Unable to update password"}</p>
                    <p className="text-xs mt-0.5 opacity-80">{passwordStatus.msg}</p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type={showCurrentPassword ? "text" : "password"} required value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} placeholder="Enter your current password" className="w-full h-9 pl-10 pr-11 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#dd7230] focus:ring-4 focus:ring-[#dd7230]/10 transition-all" />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input type={showNewPassword ? "text" : "password"} required value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} placeholder="Create a new password" className={`w-full h-9 pl-10 pr-11 bg-gray-50 border rounded-lg text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-4 transition-all ${passwords.new.length > 0 ? (isPasswordValid ? "border-green-300 focus:border-green-400 focus:ring-green-100" : "border-gray-200 focus:border-[#dd7230] focus:ring-[#dd7230]/10") : "border-gray-200 focus:border-[#dd7230] focus:ring-[#dd7230]/10"}`} />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwords.new.length > 0 && !isPasswordValid && (
                    <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-gray-700">Password requirements</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <PasswordRequirement valid={passValidation.length} text="At least 8 characters" />
                        <PasswordRequirement valid={passValidation.uppercase} text="1 uppercase letter" />
                        <PasswordRequirement valid={passValidation.number} text="1 number" />
                        <PasswordRequirement valid={passValidation.special} text="1 special character" />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <CheckCircle className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${passwords.confirm && passwords.new === passwords.confirm ? "text-green-500" : "text-gray-400"}`} />
                    <input type={showConfirmPassword ? "text" : "password"} required value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Re-enter your new password" className={`w-full h-9 pl-10 pr-11 bg-gray-50 border rounded-lg text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-4 transition-all ${passwords.confirm && passwords.new !== passwords.confirm ? "border-red-300 focus:border-red-400 focus:ring-red-100" : passwords.confirm && passwords.new === passwords.confirm ? "border-green-300 focus:border-green-400 focus:ring-green-100" : "border-gray-200 focus:border-[#dd7230] focus:ring-[#dd7230]/10"}`} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer">
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwords.confirm && passwords.new !== passwords.confirm && <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500"><AlertCircle className="w-3.5 h-3.5" /> Passwords do not match.</div>}
                  {passwords.confirm && passwords.new === passwords.confirm && <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600"><CheckCircle className="w-3.5 h-3.5" /> Passwords match.</div>}
                </div>
              </div>

              <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-400"><Shield className="w-3.5 h-3.5" /> Your password is securely transmitted.</div>
                <button type="submit" disabled={isUpdatingPassword || !passwords.current || !passwords.new || !passwords.confirm || !isPasswordValid || passwords.new !== passwords.confirm} className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-[#dd7230] text-white text-xs font-semibold rounded-lg hover:bg-[#b8591f] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:shadow-orange-100 active:scale-[0.98] cursor-pointer">
                  {isUpdatingPassword ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : <><Lock className="w-4 h-4" /> Update Password</>}
                </button>
              </div>
            </form>
          </div>
        </TabsContent>
      </Tabs>

      
      {/* UNSAVED CHANGES MODAL */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unsaved Changes</h3>
            <p className="text-sm text-gray-600 mb-6">
              You have unsaved changes in your {activeTab === "profile" ? "Profile Details" : "Security Settings"}. Do you want to save or discard them?
            </p>
            <div className="flex flex-col gap-2.5">
              <button onClick={handleSaveFromModal} className="w-full py-2.5 bg-[#DD7230] text-white rounded-xl hover:bg-[#b8591f] transition-colors font-semibold text-sm">
                Save Changes
              </button>
              <button onClick={handleDiscardChanges} className="w-full py-2.5 bg-gray-100 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors font-semibold text-sm">
                Discard Changes
              </button>
              <button onClick={() => { setShowUnsavedModal(false); setPendingTab(null); }} className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP MODAL */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-gray-900 mb-2">Verify New Email</h3>
            <p className="text-sm text-gray-600 mb-6">
              We sent a 6-digit code to <strong>{profileData.email}</strong>. Enter it below to confirm your new email.
            </p>

            {profileStatus?.type === "error" && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileStatus.msg}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Verification Code</label>
                <div className="flex gap-2">
                  <input
                    type="text" maxLength={6} required value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit code"
                    className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono tracking-widest focus:bg-white focus:outline-none focus:border-[#DD7230] focus:ring-2 focus:ring-[#DD7230]/20"
                  />
                  <button
                    type="button" onClick={handleSendOtp} disabled={isSendingOtp || otpCountdown > 0}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-xs font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : otpCountdown > 0 ? `Resend (${otpCountdown}s)` : "Resend Code"}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowOtpModal(false)}
                  className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button" onClick={submitProfileUpdate} disabled={isUpdatingProfile || otpCode.length !== 6}
                  className="flex-1 py-2.5 bg-[#DD7230] text-white rounded-xl hover:bg-[#b8591f] transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isUpdatingProfile ? <Loader2 className="w-4 h-4 animate-spin"/> : "Verify & Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS / LOGOUT MODAL */}
      {logoutCountdown !== null && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/60 backdrop-blur-md px-4">
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-7 sm:p-8 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full bg-[#dd7230]/10 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-[#dd7230]" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{modalContent.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">{modalContent.message}</p>
              <div className="mt-6 mb-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin text-[#dd7230]" /> Redirecting in
                <span className="inline-flex items-center justify-center min-w-[30px] h-[30px] px-2 rounded-lg bg-[#dd7230]/10 text-[#dd7230] font-bold">{logoutCountdown}</span>
                seconds
              </div>
              <button onClick={handleForceLogout} className="w-full h-9 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-[0.98]">
                <LogOut className="w-4 h-4" /> Sign out now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordRequirement({ valid, text }: { valid: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${valid ? "text-green-600" : "text-gray-500"}`}>
      <span className={`flex items-center justify-center w-5 h-5 rounded-full ${valid ? "bg-green-100" : "bg-gray-200"}`}>
        {valid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </span>
      <span>{text}</span>
    </div>
  );
}
