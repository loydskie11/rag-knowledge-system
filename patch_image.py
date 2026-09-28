import subprocess

# 1. Get the current file contents
with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    current_content = f.read()

# 2. Extract ImageUploadField from HEAD
result = subprocess.run(["git", "show", "HEAD:src/app/pages/DocumentGenerator.tsx"], capture_output=True, text=True, encoding="utf-8")
old_content = result.stdout

start_idx = old_content.find("function ImageUploadField(props:")
if start_idx != -1:
    end_idx = old_content.find("/* =", start_idx)
    if end_idx == -1:
        end_idx = len(old_content)
    
    image_upload_comp = old_content[start_idx:end_idx]
    
    # 3. Clean up the trailing lines in current_content just in case
    # Current content has `/* ============================================================================`
    # Let's strip that.
    clean_idx = current_content.find("/* ============================================================================\n * SUBCOMPONENT: Chooser Screen")
    if clean_idx != -1:
        current_content = current_content[:clean_idx]

    # Append
    with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
        f.write(current_content.strip() + "\n\n" + image_upload_comp)
        
    print("Appended ImageUploadField!")
else:
    print("Could not find ImageUploadField in git HEAD.")
