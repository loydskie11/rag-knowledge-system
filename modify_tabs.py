import sys
import re

with open("c:/Projects/rag-governance/src/app/pages/ProfileSettings.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add states and logic after activeTab
state_insertion = """  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const hasProfileChanges = 
    profileData.fullName !== (sessionStorage.getItem("userName") || "") || 
    profileData.program !== (sessionStorage.getItem("userDepartment") || "") ||
    profileData.email !== originalEmail;

  const hasPasswordChanges = passwords.current !== "" || passwords.new !== "" || passwords.confirm !== "";

  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    if (activeTab === "profile" && hasProfileChanges) {
      setPendingTab(newTab);
      setShowUnsavedModal(true);
      return;
    }
    if (activeTab === "security" && hasPasswordChanges) {
      setPendingTab(newTab);
      setShowUnsavedModal(true);
      return;
    }
    setActiveTab(newTab);
  };

  const handleDiscardChanges = () => {
    if (activeTab === "profile") {
      setProfileData({
        fullName: sessionStorage.getItem("userName") || "",
        program: sessionStorage.getItem("userDepartment") || "",
        email: originalEmail,
      });
      setProfileStatus(null);
    } else {
      setPasswords({ current: "", new: "", confirm: "" });
      setPasswordStatus(null);
    }
    setShowUnsavedModal(false);
    if (pendingTab) setActiveTab(pendingTab);
    setPendingTab(null);
  };

  const handleSaveFromModal = () => {
    setShowUnsavedModal(false);
    if (activeTab === "profile") {
      handleProfileUpdate();
    } else {
      handlePasswordChange();
    }
  };
"""
content = content.replace('  const [activeTab, setActiveTab] = useState("profile");', '  const [activeTab, setActiveTab] = useState("profile");\n' + state_insertion)

# 2. Modify handleProfileUpdate and handlePasswordChange signatures
content = content.replace('const handleProfileUpdate = async (e: React.FormEvent) => {', 'const handleProfileUpdate = async (e?: React.FormEvent) => {')
content = content.replace('const handlePasswordChange = async (e: React.FormEvent) => {', 'const handlePasswordChange = async (e?: React.FormEvent) => {')
content = content.replace('e.preventDefault();', 'if (e) e.preventDefault();')

# 3. Change Tabs onValueChange
content = content.replace('<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">', '<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">')

# 4. Insert Unsaved Modal before the OTP Modal
modal_code = """
      {/* UNSAVED CHANGES MODAL */}
      {showUnsavedModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Unsaved Changes</h3>
            <p className="text-sm text-gray-600 mb-6">
              You have unsaved changes in your {activeTab === "profile" ? "Profile Details" : "Security Settings"}. Do you want to save or discard them?
            </p>
            <div className="flex flex-col gap-2.5">
              <button onClick={handleSaveFromModal} className="w-full py-2.5 bg-[#DD7230] text-white rounded-xl hover:bg-[#b8591f] transition-colors font-semibold text-sm">
                Save Changes
              </button>
              <button onClick={handleDiscardChanges} className="w-full py-2.5 bg-gray-100 text-rose-600 rounded-xl hover:bg-rose-50 transition-colors font-semibold text-sm">
                Discard Changes
              </button>
              <button onClick={() => { setShowUnsavedModal(false); setPendingTab(null); }} className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
"""
content = content.replace('{/* OTP MODAL */}', modal_code + '\n      {/* OTP MODAL */}')

with open("c:/Projects/rag-governance/src/app/pages/ProfileSettings.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Modifications done.")
