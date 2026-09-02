import { Link, useNavigate, useLocation } from "react-router";
import { ArrowRight, AlertCircle, Mail, Lock, X, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRole } from "../contexts/RoleContext";
import ResetPasswordModal from "../components/ResetPasswordModal";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUserRole } = useRole();
  
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateEmail, setUpdateEmail] = useState("");

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const showReset = params.get("showReset");
    const email = params.get("email");

    if (showReset === "true" && email) {
      setUpdateEmail(email);
      setIsUpdateModalOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    setIsLoading(true);

    const formBody = new URLSearchParams();
    formBody.append('username', formData.email);
    formBody.append('password', formData.password);

    try {
      const response = await axios.post("http://localhost:8000/login", formBody, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        withCredentials: true,
      });

      if (rememberMe) {
        sessionStorage.setItem("rememberedEmail", formData.email);
      } else {
        sessionStorage.removeItem("rememberedEmail");
      }

      // Security Hardening: Token is stored safely in HttpOnly cookie by backend.
      // Store non-sensitive user metadata for UI display only.
      sessionStorage.setItem('userName', response.data.full_name);
      sessionStorage.setItem('userEmail', response.data.email);
      sessionStorage.setItem('userRole', response.data.role);
      sessionStorage.setItem('userDepartment', response.data.department || '');
      sessionStorage.setItem('userAdministrativeOffice', response.data.administrative_office || '');
      sessionStorage.setItem('isIqaAuditor', String(response.data.is_iqa_auditor || false));
      
      setUserRole(response.data.role);
      navigate("/app");
      
    } catch (error: any) {
      setApiError(error.response?.data?.detail || "Failed to connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetStatus(null);
    try {
      const response = await axios.post("http://localhost:8000/send-reset-email", { email: resetEmail });
      setResetStatus({ type: 'success', msg: response.data.message });
    } catch (error: any) {
      setResetStatus({ type: 'error', msg: error.response?.data?.detail || "Failed to send reset email." });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center p-4 sm:p-6 lg:p-0 relative">
      {/* Back to Home Button */}
      <Link
        to="/"
        aria-label="Back to Home"
        className="group absolute top-6 left-6 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-2xs hover:shadow-xs hover:border-[#DD7230] transition-all"
      >
        <ArrowRight className="h-4 w-4 rotate-180 text-[#DD7230] transition-transform duration-200 group-hover:-translate-x-0.5" />
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
                className="h-24 w-24 object-contain" 
              />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#DD7230] mb-3 leading-tight">
              CTU-Argao Knowledge System
            </h1>
            <p className="text-base text-gray-700 font-medium">Cebu Technological University</p>
            <p className="text-xs text-gray-500 mt-0.5">Argao Campus</p>
            
            <div className="mt-8 p-4 bg-[#FFF4E5] border border-[#FFE0B2] rounded-xl inline-block">
              <p className="text-[#DD7230] text-xs font-semibold">
                RAG-Powered Knowledge Management System
              </p>
            </div>
          </div>
        </div>

        {/* Right Login Form Panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-white overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8 my-auto">
            
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-5">
              <div className="flex justify-center mb-2.5">
                <img 
                  src="/ctu-logo.png" 
                  alt="CTU Logo" 
                  className="h-12 w-12 object-contain" 
                />
              </div>
              <h1 className="text-base font-bold text-gray-900">CTU Argao Knowledge System</h1>
            </div>

            <div className="mb-5">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Sign in</h2>
              <p className="text-xs text-gray-500 mt-0.5">Enter your credentials to access the Knowledge System</p>
            </div>

            {/* Error Notification */}
            {apiError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700 leading-relaxed font-medium">{apiError}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all placeholder-gray-400"
                    placeholder="name@ctu.edu.ph"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-8 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all placeholder-gray-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="mr-2 w-3.5 h-3.5 rounded border-gray-300 text-[#DD7230] focus:ring-[#DD7230] cursor-pointer" 
                  />
                  <span className="text-xs text-gray-600 select-none group-hover:text-gray-900 transition-colors">Remember me</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs text-[#DD7230] hover:text-[#c66224] hover:underline font-semibold cursor-pointer transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#DD7230] text-white rounded-xl hover:bg-[#c66224] transition-all font-semibold text-xs shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-1.5 cursor-pointer active:scale-98"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-4 text-center pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Don't have an account?{" "}
                <Link to="/signup" className="text-[#DD7230] hover:text-[#c66224] hover:underline font-semibold transition-colors">
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Request Email Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50/60">
              <h3 className="text-xs font-bold text-gray-900">Reset Password</h3>
              <button 
                onClick={() => { setIsModalOpen(false); setResetStatus(null); }} 
                className="text-gray-400 hover:text-gray-700 cursor-pointer p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleForgotPassword} className="p-5 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">Enter your registered email address and we'll send you instructions to reset your password.</p>
              
              {resetStatus && (
                <div className={`p-3 rounded-xl flex items-start gap-2.5 ${resetStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                  {resetStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <p className="text-xs font-medium leading-relaxed">{resetStatus.msg}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all placeholder-gray-400"
                    placeholder="name@ctu.edu.ph"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2 bg-[#DD7230] text-white rounded-xl hover:bg-[#c66224] font-semibold text-xs shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: The actual Update Password Modal */}
      <ResetPasswordModal 
        isOpen={isUpdateModalOpen} 
        email={updateEmail} 
        onClose={() => setIsUpdateModalOpen(false)} 
      />
    </div>
  );
}