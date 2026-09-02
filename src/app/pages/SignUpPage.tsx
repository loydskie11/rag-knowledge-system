import { Link, useNavigate } from "react-router";
import {
  GraduationCap,
  User,
  Mail,
  Lock,
  X,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2
} from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
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
      await axios.post("http://localhost:8000/auth/send-otp", {
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
      setApiError("Password must be 8+ characters with an uppercase letter, a number, and a special character.");
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
      // 1. Verify OTP first
      await axios.post("http://localhost:8000/auth/verify-otp", {
        email: formData.email.trim(),
        otp_code: formData.otpCode.trim()
      });

      // 2. Proceed with user registration
      await axios.post("http://localhost:8000/register", {
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
    <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center p-4 sm:p-6 lg:p-0 relative">
      {/* Back to Home Button */}
      <Link
        to="/"
        aria-label="Back to Home"
        className="group absolute top-6 left-6 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-2xs hover:shadow-xs hover:border-[#DD7230] transition-all"
      >
        <ArrowRight className="h-4.5 w-4.5 rotate-180 text-[#DD7230] transition-transform duration-200 group-hover:-translate-x-0.5" />
      </Link>

      {/* Split View Container */}
      <div className="w-full min-h-screen flex">
        
        {/* Left Branding Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-white flex-col items-center justify-center p-12 relative border-r border-gray-200/80">
          <div className="relative z-10 text-center max-w-md">
            <div className="flex justify-center mb-6">
              <img 
                src="/ctu-logo.png" 
                alt="CTU Logo" 
                className="h-28 w-28 object-contain" 
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#DD7230] mb-3 leading-tight">
              CTU-Argao Knowledge System
            </h1>
            <p className="text-base text-gray-700 font-medium">Cebu Technological University</p>
            <p className="text-sm text-gray-500 mt-0.5">Argao Campus</p>
            
            <div className="mt-8 p-4 bg-[#FFF4E5] border border-[#FFE0B2] rounded-xl inline-block">
              <p className="text-[#DD7230] text-sm font-semibold">
                RAG-Powered Knowledge Management System
              </p>
            </div>
          </div>
        </div>

        {/* Right Sign Up Form Panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-white overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-10 my-auto">
            
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-6">
              <div className="flex justify-center mb-3">
                <img
                  src="/ctu-logo.png"
                  alt="CTU Logo"
                  className="h-14 w-14 object-contain"
                />
              </div>
              <h1 className="text-lg font-bold text-gray-900">CTU Argao Knowledge System</h1>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Account</h2>
              <p className="text-sm text-gray-500 mt-1">Register for access to institutional policies and resources</p>
            </div>

            {/* Error Notification */}
            {apiError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-sm text-rose-700 leading-relaxed font-medium">{apiError}</p>
              </div>
            )}

            {/* Success Notification */}
            {successMsg && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700 leading-relaxed font-medium">{successMsg}</p>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4">
              
              {/* Account Role Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Account Role</label>
                <div className="grid grid-cols-2 gap-3">
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
                        className={`rounded-xl border py-2.5 px-3.5 flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#DD7230] bg-[#FFF4E5] text-[#DD7230]"
                            : "border-gray-200 bg-gray-50/50 hover:bg-gray-50 text-gray-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="font-semibold text-sm">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Email Address + Inline Send Code */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="name@ctu.edu.ph"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all placeholder-gray-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isSendingOtp || otpCountdown > 0 || !formData.email.trim()}
                    className="px-4 py-2.5 bg-[#DD7230] text-white rounded-xl hover:bg-[#c66224] transition-all text-sm font-semibold whitespace-nowrap shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer active:scale-98"
                  >
                    {isSendingOtp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : otpSent ? "Resend Code" : "Send Code"}
                  </button>
                </div>
              </div>

              {/* Verification Code */}
              <div>
                <label htmlFor="otpCode" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Verification Code (6-Digit OTP)
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="otpCode"
                    type="text"
                    required
                    maxLength={6}
                    value={formData.otpCode}
                    onChange={(e) =>
                      setFormData({ ...formData, otpCode: e.target.value.replace(/\D/g, "") })
                    }
                    placeholder="Enter 6-digit code"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all placeholder-gray-400 placeholder:tracking-normal placeholder:font-sans"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full pl-10 pr-9 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full pl-10 pr-9 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Requirement Hint */}
              <p className="text-xs text-gray-400">
                Minimum 8 characters with an uppercase letter, number, and special character.
              </p>

              {/* College & Program Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    College
                  </label>
                  <select
                    aria-label="Select College"
                    required
                    value={formData.selectedCollege}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        selectedCollege: e.target.value,
                        course: ""
                      })
                    }
                    className="w-full py-2.5 px-3 text-sm rounded-xl bg-gray-50/70 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">Select College</option>
                    {academicPrograms.map((c) => (
                      <option key={c.college} value={c.college}>
                        {c.college}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Academic Program
                  </label>
                  <select
                    aria-label="Select Academic Program"
                    required
                    value={formData.course}
                    onChange={(e) =>
                      setFormData({ ...formData, course: e.target.value })
                    }
                    disabled={!formData.selectedCollege}
                    className="w-full py-2.5 px-3 text-sm rounded-xl bg-gray-50/70 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="">Select Program</option>
                    {currentCollegePrograms.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Year Level (Students Only) */}
              {formData.role === "STUDENT" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Year Level
                  </label>
                  <select
                    aria-label="Select Year Level"
                    required
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                    className="w-full py-2.5 px-3 text-sm rounded-xl bg-gray-50/70 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="">Select Year Level</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Terms and Conditions Checkbox */}
              <div className="flex items-center gap-2.5 pt-1.5">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, agreeToTerms: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-[#DD7230] focus:ring-[#DD7230] cursor-pointer shrink-0"
                />
                <div className="text-sm text-gray-600 select-none flex items-center gap-1">
                  <label htmlFor="agreeToTerms" className="cursor-pointer">
                    I agree to the
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTermsModal(true);
                    }}
                    className="text-[#DD7230] font-semibold hover:underline cursor-pointer inline-flex items-center"
                  >
                    Terms and Conditions
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#DD7230] text-white rounded-xl hover:bg-[#c66224] transition-all font-semibold text-sm shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-2 cursor-pointer active:scale-98"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <div className="mt-6 text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <Link to="/login" className="text-[#DD7230] hover:text-[#c66224] hover:underline font-semibold transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50/60">
              <h3 className="text-sm font-bold text-gray-900">Terms and Conditions</h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer p-1"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-sm text-gray-600 leading-relaxed max-h-72 overflow-y-auto">
              <p>
                By registering for an account on the CTU Argao Institutional Knowledge System, you agree to comply with institutional data governance policies and maintain account confidentiality.
              </p>
              <p>
                Student registrations receive immediate access to policy assistance and repositories. Faculty registrations are subject to administrative verification.
              </p>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50/60 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, agreeToTerms: true });
                  setShowTermsModal(false);
                }}
                className="px-5 py-2 bg-[#DD7230] text-white font-semibold text-sm rounded-xl hover:bg-[#c66224] transition-all cursor-pointer shadow-2xs"
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