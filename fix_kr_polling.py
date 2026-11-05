import re

with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "r", encoding="utf-8") as f:
    content = f.read()

target1 = """      onComplete: (name) => {
        loadDocs()
        showToast(`"${name}" successfully added to repository!`, 'success')
      },"""

repl1 = """      onComplete: (name) => {
        // Poll a few times since the backend processes vector extraction in the background
        loadDocs();
        setTimeout(loadDocs, 2000);
        setTimeout(loadDocs, 5000);
        setTimeout(loadDocs, 10000);
        showToast(`"${name}" successfully added to repository!`, 'success')
      },"""

content = content.replace(target1, repl1)

target2 = """      onComplete: (name) => {
        loadDocs()
        showToast(`New version for "${name}" successfully uploaded!`, 'success')
      },"""

repl2 = """      onComplete: (name) => {
        loadDocs();
        setTimeout(loadDocs, 2000);
        setTimeout(loadDocs, 5000);
        setTimeout(loadDocs, 10000);
        showToast(`New version for "${name}" successfully uploaded!`, 'success')
      },"""

content = content.replace(target2, repl2)

with open(r"c:\Projects\rag-governance\src\app\pages\KnowledgeRepository.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Added polling to upload completion.")
