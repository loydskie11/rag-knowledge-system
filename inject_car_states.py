import sys

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
      const { data } = await apiClient.get(`/api/car-forms?cycle_year=${encodeURIComponent(cycleYear)}`);
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
      await apiClient.post("/api/car-forms", { ...newCarForm, cycle_year: selectedIsoCycleYear });
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
      await apiClient.put(`/api/car-forms/${editingCarForm.id}`, editingCarForm);
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
      await apiClient.delete(`/api/car-forms/${carFormToDelete.id}`);
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

with open("c:/Projects/rag-governance/src/app/pages/AccreditationSupport.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Added CAR Form states and handlers!")
