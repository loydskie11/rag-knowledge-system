import re

with open("c:/Projects/rag-governance/src/app/pages/DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
if 'import apiClient from "@/app/api/client";' not in content:
    content = content.replace('import { saveAs } from "file-saver";\n', 'import { saveAs } from "file-saver";\nimport apiClient from "@/app/api/client";\n')

# 2. Fix generate-document
content = re.sub(
    r'const response = await fetch\("/api/generate-document", \{.*?body: JSON\.stringify\(\{ prompt: fullPromptPayload, targetPages \}\),\s*\}\);',
    r'const response = await apiClient.post("/generate-document", { prompt: fullPromptPayload, targetPages });',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'const data = await response\.json\(\);\s*const rawMarkdown = data\.content \|\| "";',
    r'const rawMarkdown = response.data.content || "";',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'if \(!response\.ok\) throw new Error\("Failed to generate document\."\);',
    r'',
    content,
    flags=re.DOTALL
)

# 3. Fix TemplatesScreen (the fetch(url) in useEffect)
content = re.sub(
    r'const url =\s*"/api/repository-documents" \+\s*"\?category=" \+ encodeURIComponent\("Accreditation Evidence"\) \+\s*"&status="\s*\+ encodeURIComponent\("Active"\);\s*const resp = await fetch\(url\);\s*if \(!resp\.ok\) \{\s*throw new Error\(`Failed to load repository \(HTTP \$\{resp\.status\}\)\.`\);\s*\}\s*const data = await resp\.json\(\);',
    r'const resp = await apiClient.get("/documents", { params: { category: "Template" } });\n          const data = resp.data;',
    content,
    flags=re.DOTALL
)

# 4. Fix loadRepositoryDocument
content = re.sub(
    r'const url = `/api/repository-documents/\$\{encodeURIComponent\(doc\.name\)\}/content`;.*?const payload: RepositoryDocumentContent = await resp\.json\(\);',
    r'const url = `/documents/${encodeURIComponent(doc.name)}/content`;\n      const resp = await apiClient.get(url);\n      const payload: RepositoryDocumentContent = resp.data;',
    content,
    flags=re.DOTALL
)

# 5. Fix Text and server.js reference
content = content.replace(
    'Ensure <code className="font-mono">main.py</code> is running and{" "}\n              <code className="font-mono">REPOSITORY_BACKEND_URL</code> is set on server.js.',
    'Ensure your backend server is running.'
)
content = content.replace(
    "Browse <strong>active</strong> Accreditation Evidence in the Knowledge Repository.",
    "Browse pre-formatted <strong>Templates</strong> from the Knowledge Repository."
)

with open("c:/Projects/rag-governance/src/app/pages/DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied.")
