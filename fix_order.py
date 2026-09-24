import sys

with open("c:/Projects/rag-governance/src/app/pages/ProfileSettings.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Extract the block of code that causes the issue
start_str = "  const hasProfileChanges = "
end_str = "  const handleSaveFromModal = () => {\n    setShowUnsavedModal(false);\n    if (activeTab === \"profile\") {\n      handleProfileUpdate();\n    } else {\n      handlePasswordChange();\n    }\n  };\n"

start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx != -1 and end_idx != -1:
    extracted_block = content[start_idx:end_idx]
    
    # Remove it from its current position
    content = content[:start_idx] + content[end_idx:]
    
    # Find a safe place to put it: right before useEffect
    target_str = "  useEffect(() => {"
    target_idx = content.find(target_str)
    
    if target_idx != -1:
        content = content[:target_idx] + extracted_block + "\n" + content[target_idx:]
        
        with open("c:/Projects/rag-governance/src/app/pages/ProfileSettings.tsx", "w", encoding="utf-8") as f:
            f.write(content)
        print("Fixed initialization order!")
    else:
        print("Target 'useEffect' not found")
else:
    print("Block to extract not found")
