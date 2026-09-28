import re

with open("c:/Projects/rag-governance/src/app/pages/DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_block = """        try {
          const response = await apiClient.post("/generate-document", { prompt: fullPromptPayload, targetPages });
          if (response.ok) {
            const data = await response.json();
            rawContent = data.content ?? "";
          } else throw new Error("Server returned error status");
        } catch {"""

new_block = """        try {
          const response = await apiClient.post("/generate-document", { prompt: fullPromptPayload, targetPages });
          rawContent = response.data.content ?? "";
        } catch {"""

content = content.replace(old_block, new_block)

with open("c:/Projects/rag-governance/src/app/pages/DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed generate-document block.")
