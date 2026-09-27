import sys
import re

with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update isoSubTab type
content = content.replace(
    'const [isoSubTab, setIsoSubTab] = useState<"clauses" | "qms">("clauses");',
    'const [isoSubTab, setIsoSubTab] = useState<"clauses" | "qms" | "car">("clauses");'
)

# 2. Inject CAR form states and functions near QMS states
car_states = """
  // --- CAR FORMS STATES ---
  const [carForms, setCarForms] = useState<any[]>([]);
  const [isLoadingCarForms, setIsLoadingCarForms] = useState(false);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [showEditCarModal, setShowEditCarModal] = useState(false);
  const [showDeleteCarModal, setShowDeleteCarModal] = useState(false);
  const [isAddingCar, setIsAddingCar] = useState(false);
  const [isEditingCar, setIsEditingCar] = useState(false);
  const [isDeletingCar, setIsDeletingCar] = useState(false);
  const [editingCarForm, setEditingCarForm] = useState<any>(null);
  const [carFormToDelete, setCarFormToDelete] = useState<any>(null);
  const [newCarForm, setNewCarForm] = useState({
    car_no: "", date_issued: "", revision: "", finding_category: "UNKNOWN",
    type_of_non_conformity: "", auditor_name: "", acknowledged_by: "", campus: "",
    area: "", findings: "", root_cause: "", immediate_action: "", corrective_measure: "", status: "Open"
  });

  const fetchCarForms = async (cycleYear: string) => {
    setIsLoadingCarForms(true);
    try {
      const { data } = await apiClient.get(`/car-forms?cycle_year=${encodeURIComponent(cycleYear)}`);
      setCarForms(data);
    } catch (error) {
      console.error("Failed to fetch CAR forms", error);
    } finally {
      setIsLoadingCarForms(false);
    }
  };

  useEffect(() => {
    fetchCarForms(selectedIsoCycleYear);
  }, [selectedIsoCycleYear]);

  const handleCreateCarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingCar(true);
    try {
      await apiClient.post("/car-forms", { ...newCarForm, cycle_year: selectedIsoCycleYear });
      showToast("CAR Form created successfully!", "success");
      setShowAddCarModal(false);
      setNewCarForm({
        car_no: "", date_issued: "", revision: "", finding_category: "UNKNOWN",
        type_of_non_conformity: "", auditor_name: "", acknowledged_by: "", campus: "",
        area: "", findings: "", root_cause: "", immediate_action: "", corrective_measure: "", status: "Open"
      });
      fetchCarForms(selectedIsoCycleYear);
    } catch (error) {
      showToast("Failed to create CAR Form.", "error");
    } finally {
      setIsAddingCar(false);
    }
  };

  const handleEditCarSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCarForm) return;
    setIsEditingCar(true);
    try {
      await apiClient.put(`/car-forms/${editingCarForm.id}`, editingCarForm);
      showToast("CAR Form updated!", "success");
      setShowEditCarModal(false);
      setEditingCarForm(null);
      fetchCarForms(selectedIsoCycleYear);
    } catch (error) {
      showToast("Failed to update CAR Form.", "error");
    } finally {
      setIsEditingCar(false);
    }
  };

  const handleDeleteCarSubmit = async () => {
    if (!carFormToDelete) return;
    setIsDeletingCar(true);
    try {
      await apiClient.delete(`/car-forms/${carFormToDelete.id}`);
      showToast("CAR Form deleted.", "success");
      setShowDeleteCarModal(false);
      setCarFormToDelete(null);
      fetchCarForms(selectedIsoCycleYear);
    } catch (error) {
      showToast("Failed to delete CAR Form.", "error");
    } finally {
      setIsDeletingCar(false);
    }
  };
"""
content = content.replace('// --- QMS ACTION PLAN STATES (MRC Form 6) ---', car_states + '\n  // --- QMS ACTION PLAN STATES (MRC Form 6) ---')

# 3. Add CAR Forms Button
car_tab_button = """                <button
                  onClick={() => setIsoSubTab("car")}
                  className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                    isoSubTab === "car"
                      ? "border-[#DD7230] text-gray-900 font-bold"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  CAR Forms ({carForms.length})
                </button>
              </div>"""

# Find exact place to put it
pattern_btn = r'QMS Action Plans \(\{qmsStats\.total\}\)\n\s*</button>\n\s*</div>'
content = re.sub(pattern_btn, f'QMS Action Plans ({{qmsStats.total}})\n                </button>\n{car_tab_button}', content)

# 4. Add CAR Forms Tab Content
car_tab_content = """
              {isoSubTab === "car" && (
                <div className="p-6 space-y-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Corrective Action Requests (CAR)</h3>
                      <p className="text-xs text-gray-500 mt-1">Manage CAR Form 1 documents and non-conformities.</p>
                    </div>
                    <button
                      onClick={() => setShowAddCarModal(true)}
                      className="w-full md:w-auto px-4 py-2.5 bg-[#DD7230] hover:bg-[#c45e22] text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Plus className="h-4 w-4" /> Add CAR Form 1
                    </button>
                  </div>

                  {isLoadingCarForms ? (
                    <div className="py-16 text-center text-gray-500 flex justify-center items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-[#DD7230]" />
                      <span className="text-sm font-semibold">Loading CAR Forms...</span>
                    </div>
                  ) : carForms.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs font-medium">
                      No CAR Forms found for this cycle.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {carForms.map((car) => (
                        <div key={car.id} className="bg-white rounded-xl border border-gray-200 shadow-2xs p-5 relative group flex flex-col h-full">
                          <div className="flex justify-between items-start mb-3">
                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                              car.finding_category === 'MAJOR' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                              car.finding_category === 'MINOR' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                              'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {car.finding_category}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingCarForm(car); setShowEditCarModal(true); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button onClick={() => { setCarFormToDelete(car); setShowDeleteCarModal(true); }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg cursor-pointer">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <h4 className="text-sm font-bold text-gray-900 mb-1">{car.car_no || 'Pending CAR No.'}</h4>
                          <p className="text-xs text-gray-500 mb-4 line-clamp-3 flex-grow">{car.findings || 'No findings specified.'}</p>
                          <div className="pt-4 border-t border-gray-100 flex items-center justify-between mt-auto">
                            <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {car.date_issued || 'No Date'}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${
                              car.status === 'Closed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {car.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
"""

pattern_tab = r'\{isoSubTab === "clauses" \? \('
content = content.replace('{isoSubTab === "clauses" ? (', car_tab_content + '\n              {isoSubTab === "clauses" ? (')

# Write it out
with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Injected core logic!")
