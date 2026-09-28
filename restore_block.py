import re
import subprocess

# 1. Get original content from git
result = subprocess.run(["git", "show", "HEAD:src/app/pages/DocumentGenerator.tsx"], capture_output=True, text=True, encoding="utf-8")
original = result.stdout

# The state variables to copy start right after `const [prompt, setPrompt] = useState("");`
# and end at `const handleLineSpacingChange = (ls: LineSpacing) => {`

start_marker = '  const [prompt, setPrompt] = useState("");'
end_marker = '  const handleLineSpacingChange = (ls: LineSpacing) => {'

start_idx = original.find(start_marker)
end_idx = original.find(end_marker)

if start_idx != -1 and end_idx != -1:
    missing_block = original[start_idx + len(start_marker) : end_idx]
    
    # 2. Get current content
    with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
        current = f.read()
    
    # We want to inject `missing_block` right before `const handleLineSpacingChange`
    # But wait, in the current file, where is `handleLineSpacingChange`?
    curr_end_idx = current.find(end_marker)
    
    if curr_end_idx != -1:
        # We need to make sure we don't accidentally duplicate `wizard` states if we just inject everything
        # Actually, `missing_block` contains ALL the original states.
        # Let's just inject `missing_block` right before `handleLineSpacingChange` in current.
        new_content = current[:curr_end_idx] + missing_block + current[curr_end_idx:]
        
        with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Restored missing block successfully!")
    else:
        print("Could not find handleLineSpacingChange in current")
else:
    print("Could not find boundaries in original")

