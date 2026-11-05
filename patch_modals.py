import re

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# ----------------- ADD MODAL -----------------
add_target = """                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1">Target Date</label>
                    <input type="date" value={newCarForm.target_date} onChange={(e) => setNewCarForm({...newCarForm, target_date: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm" />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end shrink-0 gap-3">"""

add_replacement = """                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1">Target Date</label>
                    <input type="date" value={newCarForm.target_date} onChange={(e) => setNewCarForm({...newCarForm, target_date: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm" />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4 pb-2 border-b border-gray-100">
                  <div className="h-6 w-1 bg-emerald-500 rounded-full"></div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Section 3: Auditor Follow-Up & Closeout Verification</h3>
                    <p className="text-[10px] text-gray-500">To be filled in by the Auditor upon verification</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1">Follow-Up Action Result</label>
                    <select value={newCarForm.follow_up_result || ""} onChange={(e) => setNewCarForm({...newCarForm, follow_up_result: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm">
                      <option value="">-- Select Result --</option>
                      <option value="Measures complete and effective">Measures complete and effective</option>
                      <option value="Measures ineffective">Measures ineffective & for re-follow up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1">Follow-Up / Re-evaluation Date</label>
                    <input type="date" value={newCarForm.follow_up_date || ""} onChange={(e) => setNewCarForm({...newCarForm, follow_up_date: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Comments / Remarks</label>
                  <textarea rows={2} value={newCarForm.comments_remarks || ""} onChange={(e) => setNewCarForm({...newCarForm, comments_remarks: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" placeholder="Auditor remarks upon verification..." />
                </div>
                
                <div className="flex items-center gap-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                  <input type="checkbox" id="closeout_add" checked={newCarForm.non_conformity_closed || false} onChange={(e) => setNewCarForm({...newCarForm, non_conformity_closed: e.target.checked})} className="h-4 w-4 text-emerald-600 rounded" />
                  <label htmlFor="closeout_add" className="text-sm font-bold text-emerald-900 cursor-pointer">Non-Conformity Officially Closed</label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end shrink-0 gap-3">"""

if add_target in content:
    content = content.replace(add_target, add_replacement)
    print("Add modal updated.")
else:
    print("Add modal target NOT found.")


# ----------------- EDIT MODAL -----------------
edit_target = """                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Corrective Measure(s)</label>
                  <textarea rows={2} value={editingCarForm.corrective_measure || ""} onChange={(e) => setEditingCarForm({...editingCarForm, corrective_measure: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-end shrink-0">"""

edit_replacement = """                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Corrective Measure(s)</label>
                  <textarea rows={2} value={editingCarForm.corrective_measure || ""} onChange={(e) => setEditingCarForm({...editingCarForm, corrective_measure: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                </div>
                
                <div className="flex items-center gap-2 mt-4 pb-2 border-b border-gray-100">
                  <div className="h-6 w-1 bg-emerald-500 rounded-full"></div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Section 3: Auditor Follow-Up & Closeout Verification</h3>
                    <p className="text-[10px] text-gray-500">To be filled in by the Auditor upon verification</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1">Follow-Up Action Result</label>
                    <select value={editingCarForm.follow_up_result || ""} onChange={(e) => setEditingCarForm({...editingCarForm, follow_up_result: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm">
                      <option value="">-- Select Result --</option>
                      <option value="Measures complete and effective">Measures complete and effective</option>
                      <option value="Measures ineffective">Measures ineffective & for re-follow up</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F2937] mb-1">Follow-Up / Re-evaluation Date</label>
                    <input type="date" value={editingCarForm.follow_up_date || ""} onChange={(e) => setEditingCarForm({...editingCarForm, follow_up_date: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1">Comments / Remarks</label>
                  <textarea rows={2} value={editingCarForm.comments_remarks || ""} onChange={(e) => setEditingCarForm({...editingCarForm, comments_remarks: e.target.value})} className="w-full px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm" placeholder="Auditor remarks upon verification..." />
                </div>
                
                <div className="flex items-center gap-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 mb-2">
                  <input type="checkbox" id="closeout_edit" checked={editingCarForm.non_conformity_closed || false} onChange={(e) => setEditingCarForm({...editingCarForm, non_conformity_closed: e.target.checked})} className="h-4 w-4 text-emerald-600 rounded" />
                  <label htmlFor="closeout_edit" className="text-sm font-bold text-emerald-900 cursor-pointer">Non-Conformity Officially Closed</label>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-end shrink-0">"""

if edit_target in content:
    content = content.replace(edit_target, edit_replacement)
    print("Edit modal updated.")
else:
    print("Edit modal target NOT found.")

with open(r"c:\Projects\rag-governance\src\app\pages\AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)

