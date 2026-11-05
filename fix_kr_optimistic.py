import re

with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target1 = """      onComplete: (name) => {
        // Poll a few times since the backend processes vector extraction in the background
        loadDocs();
        setTimeout(loadDocs, 2000);
        setTimeout(loadDocs, 5000);
        setTimeout(loadDocs, 10000);
        showToast(`"${name}" successfully added to repository!`, 'success')
      },"""

repl1 = """      onComplete: (name) => {
        // Optimistically update the UI while background extraction runs
        const newDoc = {
            id: "temp_" + Date.now(),
            name: name,
            category: formData.category,
            office: formData.office,
            version: formData.version,
            effectivity_date: formData.effectivityDate,
            status: "Active",
            uploaded_by: userEmail,
            created_at: new Date().toISOString()
        };
        setDocuments(prev => [newDoc, ...prev]);
        
        loadDocs();
        setTimeout(loadDocs, 3000);
        setTimeout(loadDocs, 7000);
        showToast(`"${name}" successfully added to repository!`, 'success')
      },"""

content = content.replace(target1, repl1)

target2 = """      onComplete: (name) => {
        loadDocs();
        setTimeout(loadDocs, 2000);
        setTimeout(loadDocs, 5000);
        setTimeout(loadDocs, 10000);
        showToast(`New version for "${name}" successfully uploaded!`, 'success')
      },"""

repl2 = """      onComplete: (name) => {
        // Optimistically update the version in UI
        setDocuments(prev => prev.map(d => d.name === name ? { ...d, version: updateFormData.version, effectivity_date: updateFormData.effectivityDate } : d));
        
        loadDocs();
        setTimeout(loadDocs, 3000);
        setTimeout(loadDocs, 7000);
        showToast(`New version for "${name}" successfully uploaded!`, 'success')
      },"""

content = content.replace(target2, repl2)

with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Added optimistic UI update.")
