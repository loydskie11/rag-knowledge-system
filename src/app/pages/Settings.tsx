import { useState, useEffect } from "react";
import { Save, Building2, Bot, Sliders, Loader2, CheckCircle, Bell, ScanSearch, Database, Plus, Pencil, Archive, RotateCcw, X, History, Link2 } from "lucide-react";
import { apiClient } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { ModuleSkeleton } from "../components/loading/SkeletonLayouts";

type TabType = "profile" | "organization" | "car_rules" | "configuration_audit" | "notifications" | "ocr_pipeline" | "ai_engine";
type ReferenceSection = "offices" | "colleges" | "programs" | "iso_mappings";
type ReferenceItem = { id: string; code: string; name: string; is_active: boolean; unit_type?: "OFFICE" | "COLLEGE"; college_unit_id?: string };
type ISOProcessGroup = { id: string; code: string; name: string; is_active: boolean };
type ISOMapping = { id: string; process_group_id: string; organizational_unit_id: string };
type ReferenceData = { offices: ReferenceItem[]; colleges: ReferenceItem[]; programs: ReferenceItem[]; iso_process_groups: ISOProcessGroup[]; iso_mappings: ISOMapping[] };
type ConfigurationEvent = { id: string | number; user_email: string; event_type: string; description: string; event_date: string };
type CARClassificationRule = { category: string; display_name: string; requires_car: boolean; is_active: boolean; sort_order: number };

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [referenceSection, setReferenceSection] = useState<ReferenceSection>("offices");
  const [referenceData, setReferenceData] = useState<ReferenceData>({ offices: [], colleges: [], programs: [], iso_process_groups: [], iso_mappings: [] });
  const [isLoadingReferences, setIsLoadingReferences] = useState(false);
  const [isSavingReference, setIsSavingReference] = useState(false);
  const [referenceEditor, setReferenceEditor] = useState<ReferenceItem | null>(null);
  const [mappingOfficeId, setMappingOfficeId] = useState("");
  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);
  const [configurationHistory, setConfigurationHistory] = useState<ConfigurationEvent[]>([]);
  const [carRules, setCarRules] = useState<CARClassificationRule[]>([]);
  
  // Settings State
  const [settings, setSettings] = useState({
    platform_name: "", campus: "", admin_email: "",
    // Retaining these in state just in case the backend strict-validates them
    jwt_expiration: 30, otp_expiration: 10,
    ai_provider: "local", ai_model: "llama3.1", groq_model: "qwen/qwen3.8-27b",
    ai_temperature: 0.3, ai_system_prompt: "", rag_max_chunks: 5,
    
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

  const loadReferenceData = async () => {
    setIsLoadingReferences(true);
    try {
      const response = await apiClient.get("/settings/reference-data");
      setReferenceData(prev => ({ ...prev, ...response.data }));
    } catch {
      setToast({ message: "Could not load organization data.", type: "error" });
    } finally {
      setIsLoadingReferences(false);
    }
  };

  useEffect(() => {
    if (activeTab === "organization") loadReferenceData();
    if (activeTab === "configuration_audit") {
      apiClient.get("/settings/configuration-history")
        .then(response => setConfigurationHistory(response.data || []))
        .catch(() => setToast({ message: "Could not load configuration history.", type: "error" }));
    }
    if (activeTab === "car_rules") {
      apiClient.get("/car-forms/classification-rules")
        .then(response => setCarRules(response.data || []))
        .catch(() => setToast({ message: "Could not load CAR classification rules.", type: "error" }));
    }
  }, [activeTab]);

  const updateCarRule = async (rule: CARClassificationRule, requiresCar: boolean) => {
    setIsSavingReference(true);
    try {
      const { data } = await apiClient.put(`/settings/car-classification-rules/${rule.category}`, { requires_car: requiresCar, is_active: rule.is_active });
      setCarRules(items => items.map(item => item.category === rule.category ? data : item));
      setToast({ message: "CAR classification rule updated.", type: "success" });
    } catch (error: any) {
      setToast({ message: error.response?.data?.detail || "Unable to update CAR classification rule.", type: "error" });
    } finally {
      setIsSavingReference(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const startAddReference = () => {
    if (referenceSection === "iso_mappings") return;
    setReferenceEditor({
      id: "", code: "", name: "", is_active: true,
      unit_type: referenceSection === "offices" ? "OFFICE" : "COLLEGE",
      college_unit_id: referenceSection === "programs" ? referenceData.colleges.find(item => item.is_active)?.id || "" : undefined,
    });
  };

  const saveReference = async () => {
    if (!referenceEditor?.code.trim() || !referenceEditor.name.trim()) return;
    if (referenceSection === "programs" && !referenceEditor.college_unit_id) {
      setToast({ message: "Select a college for this program.", type: "error" }); return;
    }
    setIsSavingReference(true);
    try {
      const endpoint = referenceSection === "programs" ? "/settings/programs" : "/settings/organizational-units";
      const payload = referenceSection === "programs"
        ? { code: referenceEditor.code.trim().toUpperCase(), name: referenceEditor.name.trim(), college_unit_id: referenceEditor.college_unit_id, is_active: referenceEditor.is_active }
        : { code: referenceEditor.code.trim().toUpperCase(), name: referenceEditor.name.trim(), unit_type: referenceSection === "offices" ? "OFFICE" : "COLLEGE", is_active: referenceEditor.is_active };
      if (referenceEditor.id) await apiClient.put(`${endpoint}/${referenceEditor.id}`, payload);
      else await apiClient.post(endpoint, payload);
      setReferenceEditor(null);
      await loadReferenceData();
      window.dispatchEvent(new Event("reference-data-updated"));
      setToast({ message: `${referenceSection === "programs" ? "Program" : referenceSection === "offices" ? "Office" : "College"} saved.`, type: "success" });
    } catch (error: any) {
      setToast({ message: error.response?.data?.detail || "Unable to save reference data.", type: "error" });
    } finally {
      setIsSavingReference(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const toggleReferenceStatus = async (item: ReferenceItem) => {
    setIsSavingReference(true);
    try {
      if (referenceSection === "programs") {
        await apiClient.put(`/settings/programs/${item.id}`, { code: item.code, name: item.name, college_unit_id: item.college_unit_id, is_active: !item.is_active });
      } else {
        await apiClient.put(`/settings/organizational-units/${item.id}`, { code: item.code, name: item.name, unit_type: item.unit_type, is_active: !item.is_active });
      }
      await loadReferenceData();
      window.dispatchEvent(new Event("reference-data-updated"));
      setToast({ message: item.is_active ? "Item archived." : "Item reactivated.", type: "success" });
    } catch (error: any) {
      setToast({ message: error.response?.data?.detail || "Unable to change item status.", type: "error" });
    } finally {
      setIsSavingReference(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const editOfficeMapping = (officeId: string) => {
    setMappingOfficeId(officeId);
    setSelectedProcessIds(referenceData.iso_mappings.filter(item => item.organizational_unit_id === officeId).map(item => item.process_group_id));
  };

  const saveOfficeMapping = async () => {
    if (!mappingOfficeId) return;
    setIsSavingReference(true);
    try {
      await apiClient.put(`/settings/iso-mappings/${mappingOfficeId}`, { process_group_ids: selectedProcessIds });
      setMappingOfficeId("");
      await loadReferenceData();
      window.dispatchEvent(new Event("reference-data-updated"));
      setToast({ message: "Office-to-ISO mapping updated.", type: "success" });
    } catch (error: any) {
      setToast({ message: error.response?.data?.detail || "Unable to update ISO mapping.", type: "error" });
    } finally {
      setIsSavingReference(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

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
    return <ModuleSkeleton />;
  }

  const currentReferenceItems = referenceSection === "iso_mappings" ? referenceData.offices : referenceData[referenceSection];

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
      <PageHeader title="System Settings" description="Manage governance configurations, AI extraction rules, and notifications." />

      {/* Main Settings Container */}
      <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50/60 overflow-x-auto hide-scrollbar">
          <button onClick={() => setActiveTab("profile")} className={`flex items-center gap-2 px-5 py-3 text-xs transition-all whitespace-nowrap cursor-pointer ${activeTab === "profile" ? "border-b-2 border-[#DD7230] text-[#DD7230] font-semibold bg-white" : "text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-50"}`}>
            <Building2 className="h-3.5 w-3.5" /> Institutional Profile
          </button>
          <button onClick={() => { setActiveTab("organization"); setReferenceEditor(null); }} className={`flex items-center gap-2 px-5 py-3 text-xs transition-all whitespace-nowrap cursor-pointer ${activeTab === "organization" ? "border-b-2 border-[#DD7230] text-[#DD7230] font-semibold bg-white" : "text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-50"}`}>
            <Database className="h-3.5 w-3.5" /> Organization Data
          </button>
          <button onClick={() => setActiveTab("car_rules")} className={`flex items-center gap-2 px-5 py-3 text-xs transition-all whitespace-nowrap cursor-pointer ${activeTab === "car_rules" ? "border-b-2 border-[#DD7230] text-[#DD7230] font-semibold bg-white" : "text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-50"}`}>
            <Sliders className="h-3.5 w-3.5" /> CAR Rules
          </button>
          <button onClick={() => setActiveTab("configuration_audit")} className={`flex items-center gap-2 px-5 py-3 text-xs transition-all whitespace-nowrap cursor-pointer ${activeTab === "configuration_audit" ? "border-b-2 border-[#DD7230] text-[#DD7230] font-semibold bg-white" : "text-gray-500 hover:text-gray-900 font-medium hover:bg-gray-50"}`}>
            <History className="h-3.5 w-3.5" /> Configuration History
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

          {activeTab === "organization" && (
            <div className="space-y-5 animate-in slide-in-from-right-1 duration-200">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Organization and Reference Data</h2>
                  <p className="mt-1 max-w-2xl text-xs text-gray-500">Manage the offices, colleges, and programs used by assignments and system dropdowns. Codes become permanent after creation to preserve historical records.</p>
                </div>
                {referenceSection !== "iso_mappings" && <button onClick={startAddReference} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#DD7230] px-3 py-2 text-xs font-semibold text-white hover:bg-[#c96327]">
                  <Plus className="h-3.5 w-3.5" /> Add {referenceSection === "programs" ? "Program" : referenceSection === "offices" ? "Office" : "College"}
                </button>}
              </div>

              <div className="flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
                {(["offices", "colleges", "programs", "iso_mappings"] as ReferenceSection[]).map(section => (
                  <button key={section} onClick={() => { setReferenceSection(section); setReferenceEditor(null); }} className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${referenceSection === section ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                    {section === "iso_mappings" ? "ISO mappings" : `${section} (${referenceData[section].length})`}
                  </button>
                ))}
              </div>

              {referenceEditor && (
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900">{referenceEditor.id ? "Edit" : "Add"} {referenceSection === "programs" ? "academic program" : referenceSection.slice(0, -1)}</h3>
                      <p className="mt-0.5 text-[11px] text-gray-500">Archived items remain connected to their historical records.</p>
                    </div>
                    <button onClick={() => setReferenceEditor(null)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Code</label>
                      <input value={referenceEditor.code} disabled={Boolean(referenceEditor.id)} onChange={e => setReferenceEditor({ ...referenceEditor, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })} placeholder="Example: REGISTRAR" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs disabled:bg-gray-100 disabled:text-gray-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">Display name</label>
                      <input value={referenceEditor.name} onChange={e => setReferenceEditor({ ...referenceEditor, name: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs" />
                    </div>
                    {referenceSection === "programs" && (
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-gray-700">College</label>
                        <select value={referenceEditor.college_unit_id || ""} onChange={e => setReferenceEditor({ ...referenceEditor, college_unit_id: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs">
                          <option value="">Select a college</option>
                          {referenceData.colleges.filter(college => college.is_active).map(college => <option key={college.id} value={college.id}>{college.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setReferenceEditor(null)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600">Cancel</button>
                    <button onClick={saveReference} disabled={isSavingReference || !referenceEditor.code.trim() || !referenceEditor.name.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#DD7230] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                      {isSavingReference && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                    </button>
                  </div>
                </div>
              )}

              {referenceSection === "iso_mappings" ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Choose which ISO process groups each campus office can access. An office may map to more than one process group or remain intentionally unmapped.</p>
                  {referenceData.offices.map(office => {
                    const mapped = referenceData.iso_mappings.filter(item => item.organizational_unit_id === office.id).map(item => referenceData.iso_process_groups.find(group => group.id === item.process_group_id)?.name).filter(Boolean);
                    return <div key={office.id} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div><p className="text-xs font-semibold text-gray-900">{office.name}</p><p className="mt-1 text-[11px] text-gray-500">{mapped.length ? mapped.join(" · ") : "Intentionally unmapped"}</p></div>
                        <button onClick={() => editOfficeMapping(office.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"><Link2 className="h-3.5 w-3.5" /> Edit mapping</button>
                      </div>
                      {mappingOfficeId === office.id && <div className="mt-4 border-t border-gray-100 pt-4">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{referenceData.iso_process_groups.filter(group => group.is_active).map(group => <label key={group.id} className="flex items-start gap-2 rounded-lg border border-gray-200 p-2.5 text-xs text-gray-700"><input type="checkbox" className="mt-0.5" checked={selectedProcessIds.includes(group.id)} onChange={event => setSelectedProcessIds(event.target.checked ? [...selectedProcessIds, group.id] : selectedProcessIds.filter(id => id !== group.id))} /><span>{group.name}</span></label>)}</div>
                        <div className="mt-3 flex justify-end gap-2"><button onClick={() => setMappingOfficeId("")} className="rounded-lg border border-gray-200 px-3 py-2 text-xs">Cancel</button><button onClick={saveOfficeMapping} disabled={isSavingReference} className="inline-flex items-center gap-1.5 rounded-lg bg-[#DD7230] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{isSavingReference && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save mapping</button></div>
                      </div>}
                    </div>;
                  })}
                </div>
              ) : <div className="overflow-hidden rounded-xl border border-gray-200">
                {isLoadingReferences ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#DD7230]" /></div> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Code</th>{referenceSection === "programs" && <th className="px-4 py-3 font-semibold">College</th>}<th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {currentReferenceItems.map(item => (
                          <tr key={item.id} className={!item.is_active ? "bg-gray-50 text-gray-500" : "text-gray-800"}>
                            <td className="px-4 py-3 font-medium">{item.name}</td><td className="px-4 py-3 font-mono text-[11px]">{item.code}</td>
                            {referenceSection === "programs" && <td className="px-4 py-3">{referenceData.colleges.find(college => college.id === item.college_unit_id)?.name || "Unassigned"}</td>}
                            <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>{item.is_active ? "Active" : "Archived"}</span></td>
                            <td className="px-4 py-3"><div className="flex justify-end gap-1"><button onClick={() => setReferenceEditor({ ...item })} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" title="Edit"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => toggleReferenceStatus(item)} disabled={isSavingReference} className="rounded-md p-2 text-gray-500 hover:bg-gray-100" title={item.is_active ? "Archive" : "Reactivate"}>{item.is_active ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}</button></div></td>
                          </tr>
                        ))}
                        {!currentReferenceItems.length && <tr><td colSpan={referenceSection === "programs" ? 5 : 4} className="px-4 py-10 text-center text-gray-500">No items found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>}
            </div>
          )}

          {activeTab === "configuration_audit" && (
            <div className="space-y-5 animate-in slide-in-from-right-1 duration-200">
              <div><h2 className="text-sm font-semibold text-gray-900">Configuration Change History</h2><p className="mt-1 text-xs text-gray-500">System-generated history of general settings, office, college, program, and ISO mapping changes.</p></div>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-gray-50 text-gray-600"><tr><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">System administrator</th><th className="px-4 py-3 font-semibold">Change</th></tr></thead><tbody className="divide-y divide-gray-100">
                  {configurationHistory.map(event => <tr key={event.id}><td className="whitespace-nowrap px-4 py-3 text-gray-500">{event.event_date ? new Date(event.event_date).toLocaleString("en-PH") : "Unknown"}</td><td className="px-4 py-3 text-gray-700">{event.user_email}</td><td className="px-4 py-3 text-gray-800">{event.description}</td></tr>)}
                  {!configurationHistory.length && <tr><td colSpan={3} className="px-4 py-12 text-center text-gray-500">No configuration changes recorded yet.</td></tr>}
                </tbody></table></div>
              </div>
            </div>
          )}

          {activeTab === "car_rules" && (
            <div className="space-y-5 animate-in slide-in-from-right-1 duration-200 max-w-3xl">
              <div><h2 className="text-sm font-semibold text-gray-900">Finding Classification Rules</h2><p className="mt-1 text-xs text-gray-500">Choose which audit finding classifications require a formal Corrective Action Request. Changes apply to future issuance and are recorded in configuration history.</p></div>
              <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                {carRules.map(rule => <div key={rule.category} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-gray-900">{rule.display_name}</p><p className="mt-1 text-[11px] text-gray-500">{rule.requires_car ? "A CAR must be created and completed." : "Track as a finding without opening a CAR."}</p></div><label className="flex items-center gap-2 text-xs font-medium text-gray-700"><input type="checkbox" checked={rule.requires_car} disabled={isSavingReference} onChange={event => updateCarRule(rule, event.target.checked)} /> Require CAR</label></div>)}
                {!carRules.length && <div className="p-8 text-center text-xs text-gray-500">No classification rules found.</div>}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">AI operating mode</label>
                      <select 
                        value={settings.ai_provider}
                        onChange={(e) => handleChange("ai_provider", e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer text-gray-900"
                      >
                        <option value="local">Local only</option>
                        <option value="automatic">Automatic fallback</option>
                        <option value="groq">Groq only</option>
                      </select>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-500">
                        {settings.ai_provider === "local" && "Keeps questions and evidence on this device."}
                        {settings.ai_provider === "automatic" && "Uses Ollama first and sends retrieved evidence to Groq only if Ollama fails."}
                        {settings.ai_provider === "groq" && "Requires internet and sends the question and retrieved evidence to Groq."}
                      </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Local Ollama model</label>
                    <input value={settings.ai_model} onChange={(e) => handleChange("ai_model", e.target.value)} className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-900" placeholder="llama3.1" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Groq cloud model</label>
                    <input value={settings.groq_model} onChange={(e) => handleChange("groq_model", e.target.value)} disabled={settings.ai_provider === "local"} className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-gray-900 disabled:cursor-not-allowed disabled:opacity-50" placeholder="qwen/qwen3.8-27b" />
                    <p className="mt-1.5 text-[11px] text-gray-500">The API key stays in the server environment and is never shown here.</p>
                  </div>
                  <div className="md:col-span-3">
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
        {!(["organization", "car_rules", "configuration_audit"] as TabType[]).includes(activeTab) && <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-end gap-2">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#DD7230] text-white text-xs font-semibold rounded-lg hover:bg-[#DD7230] transition-colors cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isSaving ? "Saving Config..." : "Save System Settings"}
          </button>
        </div>}

      </div>
    </div>
  );
}
