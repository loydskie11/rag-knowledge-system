import { Link, useNavigate } from "react-router";
import { GraduationCap, Mail, KeyRound, Lock, CheckCircle2 } from "lucide-react";
import { useState } from "react";

type Step = "email" | "verify" | "reset" | "done";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) return;
    // In real app: trigger email sending here
    setStep("verify");
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (code.length < 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    // In real app: validate code with backend
    setStep("reset");
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    // In real app: submit new password here
    setStep("done");
  };

  const stepConfig = [
    { key: "email", label: "Email" },
    { key: "verify", label: "Verify" },
    { key: "reset", label: "Reset" },
  ];

  const currentStepIndex = stepConfig.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-white flex overflow-hidden">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#FF9501] flex-col items-center justify-center p-12 relative">
        <div className="absolute inset-0 bg-[#D97E00] opacity-20"></div>
        <div className="relative z-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center shadow-xl p-3">
              <img src="/ctu-logo.png" alt="CTU Logo" className="h-20 w-20 object-contain" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            CTU Knowledge System
          </h1>
          <p className="text-lg text-white/90 mb-1 font-medium">Cebu Technological University</p>
          <p className="text-sm text-white/80">Argao Campus</p>
          <div className="mt-8 p-4 bg-white/10 rounded-xl backdrop-blur-xs border border-white/20">
            <p className="text-white text-xs font-medium">
              Secure Account Recovery & Password Reset
            </p>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-gray-50/60">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm p-2 border border-gray-200">
                <img src="/ctu-logo.png" alt="CTU Logo" className="h-12 w-12 object-contain" />
              </div>
            </div>
            <h1 className="text-lg font-bold text-gray-900">CTU Knowledge System</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-2xs border border-gray-200 p-6 sm:p-8">

            {/* Step Indicator */}
            {step !== "done" && (
              <div className="flex items-center justify-center mb-6">
                {stepConfig.map((s, i) => (
                  <div key={s.key} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                        i < currentStepIndex
                          ? "bg-[#FF9501] text-white"
                          : i === currentStepIndex
                          ? "bg-[#FF9501] text-white ring-4 ring-[#FF9501]/20 shadow-2xs"
                          : "bg-gray-200 text-gray-500"
                      }`}>
                        {i < currentStepIndex ? "✓" : i + 1}
                      </div>
                      <span className={`text-[11px] mt-1 font-semibold ${
                        i <= currentStepIndex ? "text-[#D97E00]" : "text-gray-400"
                      }`}>
                        {s.label}
                      </span>
                    </div>
                    {i < stepConfig.length - 1 && (
                      <div className={`w-12 sm:w-16 h-0.5 mx-2 mb-4 transition-colors ${
                        i < currentStepIndex ? "bg-[#FF9501]" : "bg-gray-200"
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Step 1 — Email */}
            {step === "email" && (
              <>
                <div className="mb-5">
                  <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center mb-3 border border-[#FF9501]/20">
                    <Mail className="h-5 w-5 text-[#D97E00]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Forgot Password</h2>
                  <p className="text-xs text-gray-500">
                    Enter your registered university email to receive a 6-digit recovery code.
                  </p>
                </div>
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold mb-1.5 text-gray-700">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF9501] focus:bg-white transition-all"
                        placeholder="your.email@ctu.edu.ph"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#FF9501] text-white rounded-xl hover:bg-[#D97E00] transition-colors text-xs font-semibold shadow-2xs cursor-pointer active:scale-98"
                  >
                    Send Verification Code
                  </button>
                </form>
              </>
            )}

            {/* Step 2 — Verify Code */}
            {step === "verify" && (
              <>
                <div className="mb-5">
                  <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center mb-3 border border-[#FF9501]/20">
                    <KeyRound className="h-5 w-5 text-[#D97E00]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Enter Verification Code</h2>
                  <p className="text-xs text-gray-500">
                    We sent a 6-digit code to <span className="font-semibold text-gray-900">{email}</span>.
                  </p>
                </div>
                <form onSubmit={handleVerifySubmit} className="space-y-4">
                  <div>
                    <label htmlFor="code" className="block text-xs font-semibold mb-1.5 text-gray-700">
                      Verification Code
                    </label>
                    <input
                      id="code"
                      type="text"
                      required
                      maxLength={6}
                      value={code}
                      onChange={(e) => { setError(""); setCode(e.target.value.replace(/\D/g, "")); }}
                      className="w-full px-4 py-3 bg-gray-50/60 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 tracking-[0.4em] text-center focus:outline-none focus:ring-2 focus:ring-[#FF9501] focus:bg-white transition-all"
                      placeholder="000000"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#FF9501] text-white rounded-xl hover:bg-[#D97E00] transition-colors text-xs font-semibold shadow-2xs cursor-pointer active:scale-98"
                  >
                    Verify Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="w-full py-2 text-xs text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    ← Change email address
                  </button>
                </form>
              </>
            )}

            {/* Step 3 — Reset Password */}
            {step === "reset" && (
              <>
                <div className="mb-5">
                  <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center mb-3 border border-[#FF9501]/20">
                    <Lock className="h-5 w-5 text-[#D97E00]" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Set New Password</h2>
                  <p className="text-xs text-gray-500">
                    Choose a secure password for your account.
                  </p>
                </div>
                <form onSubmit={handleResetSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold mb-1.5 text-gray-700">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => { setError(""); setPassword(e.target.value); }}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF9501] focus:bg-white transition-all"
                        placeholder="Min. 8 characters"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-semibold mb-1.5 text-gray-700">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        id="confirmPassword"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => { setError(""); setConfirmPassword(e.target.value); }}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF9501] focus:bg-white transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#FF9501] text-white rounded-xl hover:bg-[#D97E00] transition-colors text-xs font-semibold shadow-2xs cursor-pointer active:scale-98"
                  >
                    Reset Password
                  </button>
                </form>
              </>
            )}

            {/* Step 4 — Done */}
            {step === "done" && (
              <div className="text-center py-4">
                <div className="flex justify-center mb-3">
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-200">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Password Reset!</h2>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                  Your password has been successfully updated. You can now sign in with your new credentials.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="w-full py-2.5 bg-[#FF9501] text-white rounded-xl hover:bg-[#D97E00] transition-colors text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>

          {/* Back to Login */}
          {step !== "done" && (
            <div className="mt-5 text-center">
              <Link to="/login" className="text-xs font-semibold text-[#D97E00] hover:text-[#B26500]">
                ← Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}