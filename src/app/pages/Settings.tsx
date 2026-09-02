import { useState, useEffect } from "react";
import { Save, ShieldCheck, Building2, Server, Lock, Bot, Sliders, Loader2, CheckCircle } from "lucide-react";
import axios from "axios";

type TabType = "profile" | "security" | "ai_engine";

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Settings State
  const [settings, setSettings] = useState({
    platform_name: "", campus: "", admin_email: "",
    jwt_expiration: 30, otp_expiration: 10,
    ai_model: "", ai_temperature: 0.3, ai_system_prompt: "", rag_max_chunks: 5
  });

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get("http://localhost:8000/settings");
        setSettings(response.data);
      } catch (error) {
        console.error("Failed to fetch settings");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.put("http://localhost:8000/settings", settings);
      setToast({ message: "System configurations successfully updated!", type: "success" });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast({ message: "Failed to update settings.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#DD7230]" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-10 relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium z-[100] transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
          toast.type === 'success' 
            ? 'bg-[#FFF4E5] text-[#DD7230] border border-[#DD7230]/30' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4 text-[#DD7230]" /> : <Loader2 className="h-4 w-4 text-rose-500" />}
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Configure institutional profile, authentication parameters, and AI thresholds</p>
      </div>

      {/* Main Settings Container */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/60 overflow-x-auto">
          <button 
            onClick={() => setActiveTab("profile")} 
            className={`flex items-center gap-2 px-5 py-3 text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "profile" 
                ? "border-b-2 border-[#DD7230] text-[#DD7230] font-semibold bg-white" 
                : "text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-50"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" /> Institutional Profile
          </button>
          <button 
            onClick={() => setActiveTab("security")} 
            className={`flex items-center gap-2 px-5 py-3 text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "security" 
                ? "border-b-2 border-[#DD7230] text-[#DD7230] font-semibold bg-white" 
                : "text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-50"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Security & Authentication
          </button>
          <button 
            onClick={() => setActiveTab("ai_engine")} 
            className={`flex items-center gap-2 px-5 py-3 text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "ai_engine" 
                ? "border-b-2 border-[#DD7230] text-[#DD7230] font-semibold bg-white" 
                : "text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-50"
            }`}
          >
            <Bot className="h-3.5 w-3.5" /> AI & RAG Engine
          </button>
        </div>

        <div className="p-6">
          
          {/* --- TAB 1: INSTITUTIONAL PROFILE --- */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in slide-in-from-right-1 duration-200">
              <div>
                <h2 className="text-xs font-semibold text-gray-900 mb-0.5">Institutional Identity</h2>
                <p className="text-xs text-gray-500 mb-4">These details appear on system exports, notifications, and document headers.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Platform Name</label>
                    <input 
                      type="text" 
                      value={settings.platform_name} 
                      onChange={(e) => handleChange("platform_name", e.target.value)} 
                      className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-900" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Campus</label>
                    <input 
                      type="text" 
                      value={settings.campus} 
                      onChange={(e) => handleChange("campus", e.target.value)} 
                      className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-900" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">System Administrator Email</label>
                    <input 
                      type="email" 
                      value={settings.admin_email} 
                      onChange={(e) => handleChange("admin_email", e.target.value)} 
                      className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-900" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-xs font-semibold text-gray-900 mb-0.5">Server Configuration</h2>
                <p className="text-xs text-gray-500 mb-4">Database and vector store environmental settings.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Supabase Vector DB URL</label>
                    <div className="flex items-center px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-xs font-mono select-none">
                      <Server className="h-3.5 w-3.5 mr-2 text-gray-400" /> https://xyz.supabase.co
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Environment Status</label>
                    <div className="flex items-center px-3 py-2 bg-emerald-50 border border-emerald-200/60 rounded-lg text-emerald-700 text-xs font-medium">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div> Production (Active)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 2: SECURITY & AUTHENTICATION --- */}
          {activeTab === "security" && (
            <div className="space-y-6 animate-in slide-in-from-right-1 duration-200">
              <div>
                <h2 className="text-xs font-semibold text-gray-900 mb-0.5 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-gray-500" /> Access Control Policies
                </h2>
                <p className="text-xs text-gray-500 mb-4">Verification constraints and enrollment protocols for student and faculty accounts.</p>
                <div className="space-y-3">
                  <div className="flex items-start justify-between p-4 bg-gray-50/40 border border-gray-200 rounded-xl">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900">Student Auto-Verification</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">Student accounts bypass manual admin approval and are automatically verified upon successful OTP confirmation.</p>
                    </div>
                    <input type="checkbox" defaultChecked disabled className="w-4 h-4 mt-0.5 cursor-not-allowed accent-[#DD7230]" />
                  </div>
                  <div className="flex items-start justify-between p-4 bg-gray-50/40 border border-gray-200 rounded-xl">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900">Strict Faculty Verification</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">Faculty and Administrator accounts remain in a 'Pending' state until manually verified by an existing Administrator.</p>
                    </div>
                    <input type="checkbox" defaultChecked disabled className="w-4 h-4 mt-0.5 cursor-not-allowed accent-[#DD7230]" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-xs font-semibold text-gray-900 mb-0.5">Session & Token Parameters</h2>
                <p className="text-xs text-gray-500 mb-4">Timeout limits and security expiration intervals.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">JWT Expiration (Minutes)</label>
                    <input 
                      type="number" 
                      value={settings.jwt_expiration} 
                      onChange={(e) => handleChange("jwt_expiration", Number(e.target.value))} 
                      className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">OTP Expiration (Minutes)</label>
                    <input 
                      type="number" 
                      value={settings.otp_expiration} 
                      onChange={(e) => handleChange("otp_expiration", Number(e.target.value))} 
                      className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 3: AI & RAG ENGINE --- */}
          {activeTab === "ai_engine" && (
            <div className="space-y-6 animate-in slide-in-from-right-1 duration-200">
              <div>
                <h2 className="text-xs font-semibold text-gray-900 mb-0.5 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-gray-500" /> Large Language Model (LLM) Tuning
                </h2>
                <p className="text-xs text-gray-500 mb-4">Adjust the behavior and constraints of the AskPolicy AI Assistant.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Active Model Endpoint</label>
                    <select 
                      value={settings.ai_model} 
                      onChange={(e) => handleChange("ai_model", e.target.value)} 
                      className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer text-gray-900"
                    >
                      <option value="qwen2.5">Ollama: Qwen 2.5 (Local Server)</option>
                      <option value="qwen-2.5-32b">Groq Cloud: Qwen 2.5 32B</option>
                      <option value="llama-3.1-8b-instant">Groq Cloud: Llama 3.1 8B Instant</option>
                      <option value="llama-3.3-70b-versatile">Groq Cloud: Llama 3.3 70B Versatile</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-700">Temperature Threshold</label>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-orange-50 text-[#DD7230] border border-[#DD7230]/30">
                        {settings.ai_temperature}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      value={settings.ai_temperature} 
                      onChange={(e) => handleChange("ai_temperature", parseFloat(e.target.value))} 
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2 accent-[#DD7230]" 
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
                      <span>Strict / Factual (0.0)</span>
                      <span>Balanced (0.5)</span>
                      <span>Creative (1.0)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-700">System Prompt Override</label>
                    <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">Strict Governance</span>
                  </div>
                  <textarea
                    rows={5}
                    value={settings.ai_system_prompt}
                    onChange={(e) => handleChange("ai_system_prompt", e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-all resize-none text-xs font-mono text-gray-700 leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-xs font-semibold text-gray-900 mb-0.5">Vector Search (RAG) Settings</h2>
                <p className="text-xs text-gray-500 mb-4">Control semantic chunk retrieval volume and distance metrics.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Similarity Distance Metric</label>
                    <select disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-400 cursor-not-allowed">
                      <option>Cosine Similarity (pgvector locked)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Max Chunks Retrieved (Top K)</label>
                    <input 
                      type="number" 
                      value={settings.rag_max_chunks} 
                      onChange={(e) => handleChange("rag_max_chunks", Number(e.target.value))} 
                      className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-900" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-end gap-2">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#DD7230] text-white text-xs font-semibold rounded-lg hover:bg-[#DD7230] transition-colors cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isSaving ? "Saving Config..." : "Save System Settings"}
          </button>
        </div>

      </div>
    </div>
  );
}