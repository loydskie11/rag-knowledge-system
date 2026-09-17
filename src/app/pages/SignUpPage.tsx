import { Link, useNavigate } from "react-router";
import {
  GraduationCap,
  User,
  Mail,
  Lock,
  X,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  ChevronDown
} from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import { useRole } from "../contexts/RoleContext";
import type { UserRole } from "../contexts/RoleContext";

const academicPrograms = [
  {
    college: "College of Education (COEd)",
    programs: [
      { value: "BEED", label: "Bachelor of Elementary Education" },
      { value: "BSED_MATH", label: "BSEd major in Mathematics" },
      { value: "BSED_ENGLISH", label: "BSEd major in English" },
      { value: "BTLED_HE", label: "BTLEd major in Home Economics" }
    ]
  },
  {
    college: "College of Arts and Sciences (CAS)",
    programs: [
      { value: "AB_ELS", label: "BA in English Language Studies" },
      { value: "AB_LIT", label: "BA in Literature" },
      { value: "AB_PSYCH", label: "BA in Psychology" }
    ]
  },
  {
    college: "College of Agriculture and Forestry (CAF)",
    programs: [
      { value: "BSF", label: "BS in Forestry" },
      { value: "BSA", label: "BS in Agriculture" },
      { value: "BSES", label: "BS in Environmental Science" }
    ]
  },
  {
    college: "College of Technology and Engineering (COTE)",
    programs: [
      { value: "BSIE", label: "BS in Industrial Engineering" },
      { value: "BSIT", label: "BS in Information Technology" },
      { value: "BIT_AT", label: "BIT major in Automotive Technology" },
      { value: "BIT_CT", label: "BIT major in Computer Technology" },
      { value: "BIT_DT", label: "BIT major in Drafting Technology" },
      { value: "BIT_ET", label: "BIT major in Electronics Technology" }
    ]
  },
  {
    college: "College of Hospitality and Tourism Management (CHTM)",
    programs: [
      { value: "BSHM", label: "BS in Hospitality Management" },
      { value: "BSTM", label: "BS in Tourism Management" }
    ]
  }
];

const years = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Irregular",
  "Graduate / Alumni"
];

export function SignUpPage() {
  const navigate = useNavigate();
  const { setUserRole } = useRole();

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showTermsModal, setShowTermsModal] = useState(false);

  // OTP Verification States
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    role: "STUDENT" as UserRole,
    fullName: "",
    email: "",
    otpCode: "",
    password: "",
    confirmPassword: "",
    selectedCollege: "",
    course: "",
    year: "",
    agreeToTerms: false
  });

  // Countdown timer effect
  useEffect(() => {
    let interval: any;
    if (otpCountdown > 0) {
      interval = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpCountdown]);

  const currentCollegePrograms =
    academicPrograms.find(
      (c) => c.college === formData.selectedCollege
    )?.programs || [];

  const pwdChecks = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password)
  };

  const isPasswordValid =
    pwdChecks.length &&
    pwdChecks.uppercase &&
    pwdChecks.number &&
    pwdChecks.special;

  const passwordsMatch =
    formData.password === formData.confirmPassword &&
    formData.password.length > 0;

  // Send OTP verification code
  const handleSendCode = async () => {
    setApiError("");
    setSuccessMsg("");

    if (!formData.email.trim()) {
      setApiError("Please enter your email address first.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setApiError("Please enter a valid email address.");
      return;
    }

    setIsSendingOtp(true);

    try {
      await apiClient.post("/auth/send-otp", {
        email: formData.email.trim()
      });
      setOtpSent(true);
      setOtpCountdown(60);
      setSuccessMsg("Verification code sent to your email.");
    } catch (error: any) {
      setApiError(
        error.response?.data?.detail ||
          "Failed to send verification code. Please check your email address."
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    setSuccessMsg("");

    if (!formData.fullName.trim() || !formData.email.trim()) {
      setApiError("Please enter your name and email address.");
      return;
    }

    if (!formData.otpCode.trim()) {
      setApiError("Please enter the verification code sent to your email.");
      return;
    }

    if (!isPasswordValid) {
      setApiError(
        "Password must be 8+ characters with an uppercase letter, a number, and a special character."
      );
      return;
    }

    if (!passwordsMatch) {
      setApiError("Passwords do not match.");
      return;
    }

    if (!formData.selectedCollege || !formData.course) {
      setApiError("Please select your college and academic program.");
      return;
    }

    if (formData.role === "STUDENT" && !formData.year) {
      setApiError("Please select your year level.");
      return;
    }

    if (!formData.agreeToTerms) {
      setApiError("Please agree to the Terms and Conditions to proceed.");
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post("/auth/verify-otp", {
        email: formData.email.trim(),
        otp_code: formData.otpCode.trim()
      });

      await apiClient.post("/register", {
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        full_name: formData.fullName.trim(),
        course: formData.role === "STUDENT" ? formData.course : null,
        year: formData.role === "STUDENT" ? formData.year : null,
        department: formData.role === "FACULTY" ? formData.course : null
      });

      setUserRole(formData.role);
      navigate("/login");
    } catch (error: any) {
      setApiError(
        error.response?.data?.detail ||
          "Registration failed. Please check your verification code."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-white flex items-center justify-between px-6 lg:px-16 overflow-hidden relative font-sans">
      {/* Circle Back Button (Top Left) */}
      <Link
        to="/"
        aria-label="Back to Home"
        className="absolute top-6 left-6 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md border border-gray-200 hover:shadow-lg transition-all"
      >
        <ArrowLeft className="h-4 w-4 text-[#DD7230]" />
      </Link>

      {/* Left Branding View */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center text-center pr-6">
        <img
          src="/ctu-logo.png"
          alt="CTU Logo"
          className="h-28 w-28 object-contain mb-6 drop-shadow-xs"
        />
        <h1 className="text-4xl font-extrabold text-[#DD7230] mb-2 tracking-tight">
          CTU-Argao Knowledge System
        </h1>
        <p className="text-lg text-[#DD7230] font-medium">
          Cebu Technological University
        </p>
        <p className="text-sm text-[#DD7230]/70 mt-0.5">Argao Campus</p>

        <div className="mt-8 px-6 py-3 bg-[#FFF4E5] border border-[#FFE0B2] rounded-2xl shadow-2xs">
          <p className="text-[#DD7230] text-xs font-bold uppercase tracking-wider">
            RAG-Powered Knowledge Management System
          </p>
        </div>
      </div>

      {/* Right Floating Signup Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center pl-0 lg:pl-6">
        <div className="w-full max-w-[510px] bg-white rounded-2xl shadow-xl border border-gray-200 p-7 sm:p-8">
          
          <h2 className="text-2xl font-extrabold text-[#1E293B] mb-4 tracking-tight">
            Create Account
          </h2>

          {/* Error Banner */}
          {apiError && (
            <div className="mb-3 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
              <p className="text-xs text-rose-700 font-medium">{apiError}</p>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-3 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-700 font-medium">{successMsg}</p>
            </div>
          )}

          <form onSubmit={handleCreateAccount} className="space-y-3">
            {/* Role Switcher Pill Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { value: "STUDENT", label: "Student", icon: GraduationCap },
                { value: "FACULTY", label: "Faculty", icon: User }
              ].map((option) => {
                const Icon = option.icon;
                const isSelected = formData.role === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        role: option.value as UserRole
                      })
                    }
                    className={`rounded-xl border py-2 px-3 flex items-center justify-center gap-2 transition-all cursor-pointer text-xs font-semibold ${
                      isSelected
                        ? "border-[#DD7230] bg-[#FFF4E5] text-[#DD7230]"
                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="Juan Dela Cruz"
                  className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-[#DD7230] transition-all placeholder-gray-400"
                />
              </div>
            </div>

            {/* Email Address + Send Code Button Row */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="your.email@ctu.edu.ph"
                    className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-[#DD7230] transition-all placeholder-gray-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={
                    isSendingOtp ||
                    otpCountdown > 0 ||
                    !formData.email.trim()
                  }
                  className="px-3.5 py-2 bg-[#DD7230] hover:bg-[#c66224] text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0"
                >
                  {isSendingOtp ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {otpCountdown > 0
                      ? `${otpCountdown}s`
                      : otpSent
                      ? "Resend Code"
                      : "Send Code"}
                  </span>
                </button>
              </div>
            </div>

            {/* Verification Code (OTP) Row below */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Verification Code (OTP)
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={formData.otpCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      otpCode: e.target.value.replace(/\D/g, "")
                    })
                  }
                  placeholder="Enter 6-digit OTP code"
                  className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-gray-200 rounded-xl text-xs text-gray-900 font-mono tracking-wider focus:outline-none focus:bg-white focus:border-[#DD7230] transition-all placeholder-gray-400 placeholder:tracking-normal placeholder:font-sans"
                />
              </div>
            </div>

            {/* Password & Confirm Password Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full pl-9 pr-8 py-2 bg-[#F8FAFC] border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-[#DD7230] transition-all placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value
                      })
                    }
                    placeholder="••••••••"
                    className="w-full pl-9 pr-8 py-2 bg-[#F8FAFC] border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-[#DD7230] transition-all placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 pt-0.5">
              8+ characters, with an uppercase letter, a number, and a special character.
            </p>

            {/* College & Program Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  College
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.selectedCollege}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        selectedCollege: e.target.value,
                        course: ""
                      })
                    }
                    className="w-full py-2 px-3 pr-8 text-xs rounded-xl bg-[#F8FAFC] border border-gray-200 text-gray-700 focus:outline-none focus:bg-white focus:border-[#DD7230] transition-all appearance-none cursor-pointer truncate"
                  >
                    <option value="">Select College</option>
                    {academicPrograms.map((c) => (
                      <option key={c.college} value={c.college}>
                        {c.college}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Program
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.course}
                    onChange={(e) =>
                      setFormData({ ...formData, course: e.target.value })
                    }
                    disabled={!formData.selectedCollege}
                    className="w-full py-2 px-3 pr-8 text-xs rounded-xl bg-[#F8FAFC] border border-gray-200 text-gray-700 focus:outline-none focus:bg-white focus:border-[#DD7230] transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer truncate"
                  >
                    <option value="">Select Program</option>
                    {currentCollegePrograms.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Year Level (Students Only) */}
            {formData.role === "STUDENT" && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Year Level
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                    className="w-full py-2 px-3 pr-8 text-xs rounded-xl bg-[#F8FAFC] border border-gray-200 text-gray-700 focus:outline-none focus:bg-white focus:border-[#DD7230] transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Select Year</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Terms and Conditions Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    agreeToTerms: e.target.checked
                  })
                }
                className="w-3.5 h-3.5 rounded border-gray-300 text-[#DD7230] focus:ring-[#DD7230] cursor-pointer shrink-0"
              />
              <div className="text-xs text-gray-600 select-none flex items-center gap-1">
                <label htmlFor="agreeToTerms" className="cursor-pointer">
                  I agree to the
                </label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTermsModal(true);
                  }}
                  className="text-[#DD7230] font-semibold hover:underline cursor-pointer"
                >
                  Terms and Conditions
                </button>
              </div>
            </div>

            {/* Create Account CTA */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#DD7230] text-white rounded-xl hover:bg-[#c66224] transition-all font-bold text-xs shadow-xs disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer active:scale-98 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Bottom Nav Link */}
          <div className="text-center pt-3">
            <p className="text-xs text-gray-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#DD7230] hover:underline font-bold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/60">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Terms and Conditions
              </h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-gray-600 leading-relaxed max-h-60 overflow-y-auto">
              <p>
                By registering for an account on the CTU Argao Institutional Knowledge System, you agree to comply with institutional data governance policies and maintain account confidentiality.
              </p>
              <p>
                Student registrations receive immediate access to policy assistance and repositories. Faculty registrations are subject to administrative verification.
              </p>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/60 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, agreeToTerms: true });
                  setShowTermsModal(false);
                }}
                className="px-4 py-2 bg-[#DD7230] text-white font-bold text-xs rounded-xl hover:bg-[#c66224] transition-all cursor-pointer shadow-xs"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}