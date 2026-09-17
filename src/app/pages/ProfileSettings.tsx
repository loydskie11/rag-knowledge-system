import { useState, useEffect } from "react";
import {
  User,
  Lock,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mail,
  BookOpen,
  LogOut,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  X,
  GraduationCap,
  ChevronRight,
  KeyRound,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router";

// Updated Academic Programs List (Includes CAFES & CTM)
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

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const userRole = sessionStorage.getItem("userRole") || "STUDENT";

  const [profileData, setProfileData] = useState({
    fullName: sessionStorage.getItem("userName") || "",
    program: sessionStorage.getItem("userDepartment") || "",
    email: sessionStorage.getItem("userEmail") || "",
  });

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [logoutCountdown, setLogoutCountdown] = useState<number | null>(null);
  const [modalContent, setModalContent] = useState({
    title: "",
    message: "",
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (logoutCountdown !== null && logoutCountdown > 0) {
      timer = setTimeout(() => setLogoutCountdown(logoutCountdown - 1), 1000);
    } else if (logoutCountdown === 0) {
      handleForceLogout();
    }
    return () => clearTimeout(timer);
  }, [logoutCountdown]);

  const handleForceLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);
    setIsUpdatingProfile(true);

    const originalEmail = sessionStorage.getItem("userEmail") || "";

    try {
      const response = await axios.put("http://localhost:8000/users/profile", {
        email: originalEmail,
        new_email: profileData.email,
        full_name: profileData.fullName,
        program: userRole === "ADMIN" ? "ADMIN" : profileData.program,
      });

      sessionStorage.setItem("userName", response.data.full_name);
      sessionStorage.setItem("userDepartment", response.data.program);

      if (response.data.email !== originalEmail) {
        sessionStorage.setItem("userEmail", response.data.email);
        setModalContent({
          title: "Email Address Updated!",
          message:
            "You have successfully changed your email. For your security, please sign in again using your new email address.",
        });
        setLogoutCountdown(5);
      } else {
        setProfileStatus({
          type: "success",
          msg: "Profile information updated successfully.",
        });
      }
    } catch (error: any) {
      setProfileStatus({
        type: "error",
        msg: error.response?.data?.detail || "Failed to update profile.",
      });
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
  const isPasswordValid =
    passValidation.length &&
    passValidation.uppercase &&
    passValidation.number &&
    passValidation.special;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (passwords.new !== passwords.confirm) {
      setPasswordStatus({
        type: "error",
        msg: "New passwords do not match.",
      });
      return;
    }

    if (!isPasswordValid) {
      setPasswordStatus({
        type: "error",
        msg: "Please meet all password requirements.",
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await axios.post("http://localhost:8000/users/change-password", {
        email: sessionStorage.getItem("userEmail"),
        current_password: passwords.current,
        new_password: passwords.new,
      });

      setModalContent({
        title: "Password Changed!",
        message:
          "You have successfully changed your password. For your security, you must sign in again with your new credentials.",
      });
      setLogoutCountdown(5);
    } catch (error: any) {
      setPasswordStatus({
        type: "error",
        msg: error.response?.data?.detail || "Incorrect current password.",
      });
      setIsUpdatingPassword(false);
    }
  };

  const initials =
    profileData.fullName
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name.charAt(0).toUpperCase())
      .join("") || "U";

  const isAdmin = userRole === "ADMIN";

  return (
    <div className="min-h-screen bg-[#f7f8fa] animate-in fade-in duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">

        {/* BACK BUTTON */}
        <button
          onClick={() => navigate("/app")}
          className="group inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#DD7230] transition-all mb-7 cursor-pointer"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 group-hover:border-[#DD7230]/30 group-hover:bg-[#DD7230]/5 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span>Back to Dashboard</span>
        </button>

        {/* PAGE HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Account Settings
          </h1>
          <p className="text-gray-500 mt-2 max-w-xl">
            Manage your personal information, academic details, and account security.
          </p>
        </div>

        {/* PROFILE HERO CARD */}
        <div className="relative overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-2xs mb-7">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#DD7230]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-10 w-48 h-48 bg-orange-100/40 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">

              {/* AVATAR */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#DD7230] to-[#c66224] flex items-center justify-center shadow-md">
                  <span className="text-2xl font-bold text-white">
                    {initials}
                  </span>
                </div>
                <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-white shadow-2xs flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                </div>
              </div>

              {/* USER INFO */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                    {profileData.fullName || "CTU User"}
                  </h2>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF4E5] text-[#DD7230] text-[11px] font-bold uppercase tracking-wide">
                    <Shield className="w-3 h-3" />
                    {userRole}
                  </span>
                </div>

                <p className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  {profileData.email || "No email address"}
                </p>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs font-medium text-gray-600">
                    <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                    {isAdmin
                      ? "Administrator"
                      : profileData.program || "Academic Program"}
                  </span>
                </div>
              </div>

              {/* STATUS BADGE */}
              <div className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  Account Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SETTINGS LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">

          {/* SIDEBAR */}
          <aside className="h-fit bg-white border border-gray-200 rounded-2xl p-2 shadow-2xs">
            <div className="px-3 pt-3 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Settings
              </p>
            </div>

            {/* PROFILE TAB BUTTON */}
            <button
              onClick={() => {
                setActiveTab("profile");
                setProfileStatus(null);
              }}
              className={`group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer mb-1 ${
                activeTab === "profile"
                  ? "bg-[#FFF4E5] text-[#DD7230]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                  activeTab === "profile"
                    ? "bg-[#DD7230] text-white shadow-2xs"
                    : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                }`}
              >
                <User className="w-4 h-4" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold">Profile</p>
                <p
                  className={`text-[11px] mt-0.5 ${
                    activeTab === "profile"
                      ? "text-[#DD7230]/80"
                      : "text-gray-400"
                  }`}
                >
                  Personal details
                </p>
              </div>

              {activeTab === "profile" && (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {/* SECURITY TAB BUTTON */}
            <button
              onClick={() => {
                setActiveTab("security");
                setPasswordStatus(null);
              }}
              className={`group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer ${
                activeTab === "security"
                  ? "bg-[#FFF4E5] text-[#DD7230]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                  activeTab === "security"
                    ? "bg-[#DD7230] text-white shadow-2xs"
                    : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                }`}
              >
                <Lock className="w-4 h-4" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold">Security</p>
                <p
                  className={`text-[11px] mt-0.5 ${
                    activeTab === "security"
                      ? "text-[#DD7230]/80"
                      : "text-gray-400"
                  }`}
                >
                  Password & access
                </p>
              </div>

              {activeTab === "security" && (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {/* SECURITY TIP */}
            <div className="mt-4 mx-1 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-[#DD7230]" />
                <span className="text-xs font-bold text-gray-700">
                  Security tip
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-gray-400">
                Keep your credentials private and use a strong, unique password.
              </p>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="min-w-0">

            {/* PROFILE FORM */}
            {activeTab === "profile" ? (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-[#DD7230]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Personal Information
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Update your account and academic information.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleProfileUpdate} className="p-6 sm:p-7">
                  {profileStatus && (
                    <div
                      className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${
                        profileStatus.type === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}
                    >
                      <div className="mt-0.5">
                        {profileStatus.type === "success" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {profileStatus.type === "success"
                            ? "Changes saved"
                            : "Something went wrong"}
                        </p>
                        <p className="text-xs mt-0.5 opacity-80">
                          {profileStatus.msg}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      {/* FULL NAME */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            required
                            value={profileData.fullName}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                fullName: e.target.value,
                              })
                            }
                            placeholder="Enter your full name"
                            className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#DD7230] focus:ring-4 focus:ring-[#DD7230]/10 transition-all"
                          />
                        </div>
                      </div>

                      {/* EMAIL */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="email"
                            required
                            value={profileData.email}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                email: e.target.value,
                              })
                            }
                            placeholder="Enter your email"
                            className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#DD7230] focus:ring-4 focus:ring-[#DD7230]/10 transition-all"
                          />
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1.5">
                          Changing your email will require you to sign in again.
                        </p>
                      </div>
                    </div>

                    {/* ACADEMIC PROGRAM / ROLE */}
                    {isAdmin ? (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          System Role
                        </label>
                        <div className="relative">
                          <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value="ADMINISTRATOR"
                            disabled
                            className="w-full h-11 pl-10 pr-4 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl text-sm cursor-not-allowed"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {userRole === "STUDENT"
                            ? "Course / Program"
                            : "College / Department"}
                        </label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                          <select
                            required
                            value={profileData.program}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                program: e.target.value,
                              })
                            }
                            className="appearance-none w-full h-11 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:bg-white focus:border-[#DD7230] focus:ring-4 focus:ring-[#DD7230]/10 transition-all cursor-pointer"
                          >
                            <option value="" disabled>
                              Select your academic program
                            </option>
                            {academicPrograms.map((college, cIdx) => (
                              <optgroup key={cIdx} label={college.college}>
                                {college.programs.map((prog, pIdx) => (
                                  <option key={pIdx} value={prog.value}>
                                    {prog.label}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
                    <p className="text-xs text-gray-400">
                      Make sure your information is accurate before saving.
                    </p>
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#DD7230] text-white text-sm font-semibold rounded-xl hover:bg-[#c66224] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs active:scale-98 cursor-pointer"
                    >
                      {isUpdatingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (

              /* SECURITY FORM */
              <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-[#DD7230]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      Account Security
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Protect your account by keeping your password secure.
                    </p>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} className="p-6 sm:p-7">
                  {passwordStatus && (
                    <div
                      className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-sm ${
                        passwordStatus.type === "success"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}
                    >
                      <div className="mt-0.5">
                        {passwordStatus.type === "success" ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {passwordStatus.type === "success"
                            ? "Password updated"
                            : "Unable to update password"}
                        </p>
                        <p className="text-xs mt-0.5 opacity-80">
                          {passwordStatus.msg}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">

                    {/* CURRENT PASSWORD */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          required
                          value={passwords.current}
                          onChange={(e) =>
                            setPasswords({
                              ...passwords,
                              current: e.target.value,
                            })
                          }
                          placeholder="Enter your current password"
                          className="w-full h-11 pl-10 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#DD7230] focus:ring-4 focus:ring-[#DD7230]/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* NEW PASSWORD */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          required
                          value={passwords.new}
                          onChange={(e) =>
                            setPasswords({
                              ...passwords,
                              new: e.target.value,
                            })
                          }
                          placeholder="Create a new password"
                          className="w-full h-11 pl-10 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#DD7230] focus:ring-4 focus:ring-[#DD7230]/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* PASSWORD REQUIREMENTS HINT */}
                      {passwords.new.length > 0 && (
                        <div className="mt-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                          <p className="text-xs font-bold text-gray-700 mb-2">
                            Password requirements
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <PasswordRequirement
                              valid={passValidation.length}
                              text="At least 8 characters"
                            />
                            <PasswordRequirement
                              valid={passValidation.uppercase}
                              text="1 uppercase letter"
                            />
                            <PasswordRequirement
                              valid={passValidation.number}
                              text="1 number"
                            />
                            <PasswordRequirement
                              valid={passValidation.special}
                              text="1 special character"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CONFIRM PASSWORD */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <CheckCircle
                          className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
                            passwords.confirm &&
                            passwords.new === passwords.confirm
                              ? "text-emerald-500"
                              : "text-gray-400"
                          }`}
                        />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={passwords.confirm}
                          onChange={(e) =>
                            setPasswords({
                              ...passwords,
                              confirm: e.target.value,
                            })
                          }
                          placeholder="Re-enter your new password"
                          className="w-full h-11 pl-10 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-[#DD7230] focus:ring-4 focus:ring-[#DD7230]/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {passwords.confirm &&
                        passwords.new !== passwords.confirm && (
                          <p className="text-xs text-rose-500 mt-1.5">
                            Passwords do not match.
                          </p>
                        )}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Shield className="w-3.5 h-3.5" />
                      Your password is securely transmitted.
                    </div>
                    <button
                      type="submit"
                      disabled={
                        isUpdatingPassword ||
                        !passwords.current ||
                        !passwords.new ||
                        !passwords.confirm ||
                        !isPasswordValid ||
                        passwords.new !== passwords.confirm
                      }
                      className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#DD7230] text-white text-sm font-semibold rounded-xl hover:bg-[#c66224] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs active:scale-98 cursor-pointer"
                    >
                      {isUpdatingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating Password...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Update Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </main>
        </div>

        {/* LOGOUT REDIRECT MODAL */}
        {logoutCountdown !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center animate-in zoom-in-95 duration-300 mx-4 border border-gray-200">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {modalContent.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                {modalContent.message} <br />
                <br />
                Redirecting in{" "}
                <strong className="text-[#DD7230] text-base">
                  {logoutCountdown}
                </strong>{" "}
                seconds...
              </p>
              <button
                onClick={handleForceLogout}
                className="w-full py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <LogOut className="h-4 w-4" /> Sign out now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordRequirement({
  valid,
  text,
}: {
  valid: boolean;
  text: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-xs ${
        valid ? "text-emerald-600" : "text-gray-500"
      }`}
    >
      <span
        className={`flex items-center justify-center w-5 h-5 rounded-full ${
          valid ? "bg-emerald-100" : "bg-gray-200"
        }`}
      >
        {valid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </span>
      <span>{text}</span>
    </div>
  );
}