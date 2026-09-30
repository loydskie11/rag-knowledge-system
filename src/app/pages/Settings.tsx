import { useState, useEffect } from "react";
import { Save, Building2, Bot, Sliders, Loader2, CheckCircle, Bell, FileText, ScanSearch, AlertTriangle } from "lucide-react";
import { apiClient } from "../api/client";

type TabType = "profile" | "notifications" | "ocr_pipeline" | "ai_engine";

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Settings State
  const [settings, setSettings] = useState({
    platform_name: "", campus: "", admin_email: "",
    // Retaining these in state just in case the backend strict-validates them
    jwt_expiration: 30, otp_expiration: 10,
    ai_model: "", ai_temperature: 0.3, ai_system_prompt: "", rag_max_chunks: 5,
    
    // New Advanced Settings
    ocr_vision_fallback: true,
    ocr_char_threshold: 50,
    car_alerts: "instant",
    iso_routing: "assigned",
    rag_min_score: 0.75
  });

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get("/settings");
        setSettings(prev => ({ ...prev, ...response.data }));
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
      await apiClient.put("/settings", settings);
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
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage governance configurations, AI extraction rules, and notifications.</p>
      </div>

      {/* Main Settings Container */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/60 overflow-x-auto hide-scrollbar">
          <button onClick={() => setActiveTab("profile")} className={`flex items-center gap-2 px-5 py-3 text-xs transition-all whitespace-nowrap cursor-pointer ${activeTab === "profile" ? "border-b-2 border-[#DD7230] text-[#DD7230] font-semibold bg-white" : "text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-50"}`}>
            <Building2 className="h-3.5 w-3.5" /> Institutional Profile
          </button>
          <button onClick={() => setActiveTab("notifications")} className={`flex items-center gap-2 px-5 py-3 text-xs transition-all whitespace-nowrap cursor-pointer ${activeTab === "notifications" ? "border-b-2 border-[#DD7230] text-[#DD7230] font-semibold bg-white" : "text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-50"}`}>
            <Bell className="h-3.5 w-3.5" /> Notifications & Audit
          </button>
          <button onClick={() => setActiveTab("ocr_pipeline")} className={`flex items-center gap-2 px-5 py-3 text-xs transition-all whitespace-nowrap cursor-pointer ${activeTab === "ocr_pipeline" ? "border-b-2 border-[#DD7230] text-[#DD7230] font-semibold bg-white" : "text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-50"}`}>
            <ScanSearch className="h-3.5 w-3.5" /> Document & OCR Pipeline
          </button>
          <button onClick={() => setActiveTab("ai_engine")} className={`flex items-center gap-2 px-5 py-3 text-xs transition-all whitespace-nowrap cursor-pointer ${activeTab === "ai_engine" ? "border-b-2 border-[#DD7230] text-[#DD7230] font-semibold bg-white" : "text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-50"}`}>
            <Bot className="h-3.5 w-3.5" /> AI & RAG Engine
          </button>
        </div>

        <div className="p-6">
          
          {/* --- TAB 1: INSTITUTIONAL PROFILE --- */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in slide-in-from-right-1 duration-200 max-w-3xl">
              <div>
                <h2 className="text-xs font-semibold text-gray-900 mb-0.5">Institutional Identity</h2>
                <p className="text-xs text-gray-500 mb-4">These details appear on system exports, notifications, and document headers.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Platform Name</label>
                    <input type="text" value={settings.platform_name} onChange={(e) => handleChange("platform_name", e.target.value)} className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Campus / Branch</label>
                    <input type="text" value={settings.campus} onChange={(e) => handleChange("campus", e.target.value)} className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">System Administrator Email</label>
                    <input type="email" value={settings.admin_email} onChange={(e) => handleChange("admin_email", e.target.value)} className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-900" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 2: NOTIFICATIONS & AUDIT --- */}
          {activeTab === "notifications" && (
            <div className="space-y-6 animate-in slide-in-from-right-1 duration-200 max-w-3xl">
              <div>
                <h2 className="text-xs font-semibold text-gray-900 mb-0.5 flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-gray-500" /> Workflow Alerts
                </h2>
                <p className="text-xs text-gray-500 mb-4">Manage how and when users are notified of ISO compliance changes and Corrective Action Requests (CAR).</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50/40 border border-gray-200 rounded-xl">
                    <label className="block text-xs font-semibold text-gray-900 mb-1">CAR Form Issuance Alerts</label>
                    <p className="text-[11px] text-gray-500 mb-3">Determines alert frequency when a new CAR is issued to a department.</p>
                    <select value={settings.car_alerts} onChange={(e) => handleChange("car_alerts", e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]">
                      <option value="instant">Instant Email Notification</option>
                      <option value="digest">Daily Digest (End of Day)</option>
                    </select>
                  </div>
                  
                  <div className="p-4 bg-gray-50/40 border border-gray-200 rounded-xl">
                    <label className="block text-xs font-semibold text-gray-900 mb-1">ISO 'Needs Revision' Routing</label>
                    <p className="text-[11px] text-gray-500 mb-3">Who receives notifications when an evidence file is returned for revision?</p>
                    <select value={settings.iso_routing} onChange={(e) => handleChange("iso_routing", e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]">
                      <option value="assigned">Only Assigned Department / Auditor</option>
                      <option value="all_admins">All System Administrators</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 3: DOCUMENT & OCR PIPELINE --- */}
          {activeTab === "ocr_pipeline" && (
            <div className="space-y-6 animate-in slide-in-from-right-1 duration-200 max-w-3xl">
              <div>
                <h2 className="text-xs font-semibold text-gray-900 mb-0.5 flex items-center gap-1.5">
                  <ScanSearch className="h-3.5 w-3.5 text-gray-500" /> AI Vision & Extraction Rules
                </h2>
                <p className="text-xs text-gray-500 mb-4">Configure thresholds for the background PyMuPDF and PaddleOCR workers.</p>
                
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/40 border border-gray-200 rounded-xl gap-4">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900">Hybrid Router: Llama3.2-Vision Fallback</h3>
                      <p className="text-[11px] text-gray-500 mt-1 max-w-md">If PaddleOCR detects heavily fragmented text or complex charts, auto-forward the specific page to the Vision LLM. Highly accurate but increases processing time.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.ocr_vision_fallback} onChange={(e) => handleChange("ocr_vision_fallback", e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#DD7230]"></div>
                    </label>
                  </div>

                  <div className="p-4 bg-gray-50/40 border border-gray-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900">OCR Native Text Threshold (Characters)</h3>
                      <p className="text-[11px] text-gray-500 mt-1 max-w-md">If native digital extraction (PyMuPDF) yields fewer characters than this per page, the system classifies it as "Scanned" and triggers PaddleOCR.</p>
                    </div>
                    <input 
                      type="number" 
                      value={settings.ocr_char_threshold} 
                      onChange={(e) => handleChange("ocr_char_threshold", Number(e.target.value))} 
                      className="w-24 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-center font-mono font-bold" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB 4: AI & RAG ENGINE --- */}
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
                        value={settings.ai_model || "llama3.1"} 
                        onChange={(e) => handleChange("ai_model", e.target.value)} 
                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer text-gray-900"
                      >
                        <option value="llama3.1">Ollama: Llama 3.1 (Local Server)</option>
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
                    rows={4}
                    value={settings.ai_system_prompt}
                    onChange={(e) => handleChange("ai_system_prompt", e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-all resize-none text-xs font-mono text-gray-700 leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h2 className="text-xs font-semibold text-gray-900 mb-0.5">Vector Search (RAG) Retrieval Rules</h2>
                <p className="text-xs text-gray-500 mb-4">Control semantic chunk retrieval volume and distance metrics.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Max Chunks Retrieved (Top K)</label>
                    <input 
                      type="number" 
                      value={settings.rag_max_chunks} 
                      onChange={(e) => handleChange("rag_max_chunks", Number(e.target.value))} 
                      className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-900" 
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-gray-700">Min. Similarity Confidence Score</label>
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        {(settings.rag_min_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={settings.rag_min_score} 
                      onChange={(e) => handleChange("rag_min_score", parseFloat(e.target.value))} 
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2 accent-indigo-600" 
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
                      <span>Lenient (0.0)</span>
                      <span>Strict (1.0)</span>
                    </div>
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
