import sys
import re

with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

modals = """
      {/* --- ADD CAR FORM 1 MODAL --- */}
      {showAddCarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230] my-8 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB] shrink-0">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Create Corrective Action Request (CAR Form 1)</h2>
                <p className="text-xs text-gray-500 mt-0.5">Digitize a non-conformity findings report.</p>
              </div>
              <button onClick={() => setShowAddCarModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCarSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
              <div className="p-4 bg-orange-50/50 border border-[#DD7230]/30 rounded-xl shrink-0">
                <label className="text-xs font-bold text-[#DD7230] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5" /> AI Auto-Fill from Scanned Form
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    disabled={isExtractingCar}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsExtractingCar(true);
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        const res = await apiClient.post("/api/extract-car-form", formData);
                        const data = res.data;
                        
                        setNewCarForm(prev => ({
                          ...prev,
                          car_no: data.car_no || "",
                          date_issued: data.date || "",
                          revision: data.revision || "",
                          finding_category: data.finding_category || "UNKNOWN",
                          auditor_name: data.auditor_name || "",
                          acknowledged_by: data.acknowledged_by || "",
                          campus: data.campus || "",
                          area: data.area || "",
                          findings: data.findings || "",
                          root_cause: data.root_cause || "",
                          immediate_action: data.immediate_action || "",
                          corrective_measure: data.corrective_measure || ""
                        }));
                        showToast("CAR Form parsed and fields populated!", "success");
                      } catch {
                        showToast("Failed to parse CAR form. Please fill manually.", "error");
                      } finally {
                        setIsExtractingCar(false);
                        e.target.value = "";
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#DD7230] file:text-white hover:file:bg-[#c45e22] file:cursor-pointer cursor-pointer disabled:opacity-50"
                  />
                  {isExtractingCar && <Loader2 className="h-4 w-4 animate-spin text-[#DD7230] shrink-0" />}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">CAR No.</label>
                  <input type="text" required value={newCarForm.car_no} onChange={(e) => setNewCarForm({...newCarForm, car_no: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" placeholder="e.g. 23-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Date Issued</label>
                  <input type="date" value={newCarForm.date_issued} onChange={(e) => setNewCarForm({...newCarForm, date_issued: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Category</label>
                  <select value={newCarForm.finding_category} onChange={(e) => setNewCarForm({...newCarForm, finding_category: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm">
                    <option value="MAJOR">MAJOR</option>
                    <option value="MINOR">MINOR</option>
                    <option value="OBSERVATION">OBSERVATION</option>
                    <option value="UNKNOWN">UNKNOWN</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Auditor Name</label>
                  <input type="text" value={newCarForm.auditor_name} onChange={(e) => setNewCarForm({...newCarForm, auditor_name: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Acknowledged By</label>
                  <input type="text" value={newCarForm.acknowledged_by} onChange={(e) => setNewCarForm({...newCarForm, acknowledged_by: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1">Statement of Finding(s)</label>
                <textarea required rows={3} value={newCarForm.findings} onChange={(e) => setNewCarForm({...newCarForm, findings: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" placeholder="Detailed findings..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1">Root Cause(s)</label>
                <textarea rows={2} value={newCarForm.root_cause} onChange={(e) => setNewCarForm({...newCarForm, root_cause: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" placeholder="Root cause analysis..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Immediate Action(s)</label>
                  <textarea rows={2} value={newCarForm.immediate_action} onChange={(e) => setNewCarForm({...newCarForm, immediate_action: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Corrective Measure(s)</label>
                  <textarea rows={2} value={newCarForm.corrective_measure} onChange={(e) => setNewCarForm({...newCarForm, corrective_measure: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end shrink-0">
                <button type="submit" disabled={isAddingCar} className="px-6 py-2.5 bg-[#DD7230] text-white rounded-xl font-bold text-sm hover:bg-[#c45e22] transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                  {isAddingCar && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save CAR Form 1
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT CAR FORM 1 MODAL --- */}
      {showEditCarModal && editingCarForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230] my-8 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB] shrink-0">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Edit CAR Form 1</h2>
                <p className="text-xs text-gray-500 mt-0.5">Update findings or corrective measures.</p>
              </div>
              <button onClick={() => setShowEditCarModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditCarSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Status</label>
                  <select value={editingCarForm.status} onChange={(e) => setEditingCarForm({...editingCarForm, status: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-bold text-[#DD7230]">
                    <option value="Open">Open</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">CAR No.</label>
                  <input type="text" required value={editingCarForm.car_no} onChange={(e) => setEditingCarForm({...editingCarForm, car_no: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Category</label>
                  <select value={editingCarForm.finding_category} onChange={(e) => setEditingCarForm({...editingCarForm, finding_category: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm">
                    <option value="MAJOR">MAJOR</option>
                    <option value="MINOR">MINOR</option>
                    <option value="OBSERVATION">OBSERVATION</option>
                    <option value="UNKNOWN">UNKNOWN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1">Statement of Finding(s)</label>
                <textarea required rows={3} value={editingCarForm.findings} onChange={(e) => setEditingCarForm({...editingCarForm, findings: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1">Root Cause(s)</label>
                <textarea rows={2} value={editingCarForm.root_cause} onChange={(e) => setEditingCarForm({...editingCarForm, root_cause: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Immediate Action(s)</label>
                  <textarea rows={2} value={editingCarForm.immediate_action} onChange={(e) => setEditingCarForm({...editingCarForm, immediate_action: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Corrective Measure(s)</label>
                  <textarea rows={2} value={editingCarForm.corrective_measure} onChange={(e) => setEditingCarForm({...editingCarForm, corrective_measure: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end shrink-0">
                <button type="submit" disabled={isEditingCar} className="px-6 py-2.5 bg-[#DD7230] text-white rounded-xl font-bold text-sm hover:bg-[#c45e22] transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                  {isEditingCar && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CAR FORM MODAL --- */}
      <ReusableConfirmModal
        isOpen={showDeleteCarModal && !!carFormToDelete}
        onClose={() => setShowDeleteCarModal(false)}
        onConfirm={handleDeleteCarSubmit}
        isProcessing={isDeletingCar}
        title="Delete CAR Form 1"
        confirmText="Yes, Delete"
        icon={Trash2}
        description={
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              Are you sure you want to delete this CAR Form?
            </p>
            {carFormToDelete && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 font-medium mt-2 flex flex-col gap-1">
                <span className="font-bold text-gray-900">{carFormToDelete.car_no || 'Unknown CAR No'}</span>
                <span className="line-clamp-2">{carFormToDelete.findings}</span>
              </div>
            )}
          </>
        }
      />
"""

content = content.replace('{/* --- DELETE QMS EVIDENCE MODAL --- */}', modals + '\n      {/* --- DELETE QMS EVIDENCE MODAL --- */}')

with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Injected Modals!")
