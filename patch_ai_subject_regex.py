import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

pattern = r'(const fullPromptPayload = `I need you to generate the MAIN BODY CONTENT for this document\.\n.*?)(const resp = await apiClient\.post\("/generate-document", \{ prompt: fullPromptPayload, targetPages \}\);\n\s*const aiBody = resp\.data\.content \|\| "";\n\s*let finalHtml = wizardHtml;)'

replacement = r'''const fullPromptPayload = `I need you to generate the MAIN BODY CONTENT and a SUBJECT for this document.
Instructions: ${prompt}
${pagePromptInstruction}
IMPORTANT: Output the subject on the very first line prefixed with "SUBJECT:", followed by an empty line, then the raw text/HTML paragraphs of the body. Do not output any Markdown blockticks or other headers.`;

      const resp = await apiClient.post("/generate-document", { prompt: fullPromptPayload, targetPages });
      let aiBody = resp.data.content || "";
      let aiSubject = "";
      
      const subjectMatch = aiBody.match(/^SUBJECT:\\s*(.*?)(?:\\n|<br>)/i);
      if (subjectMatch) {
          aiSubject = subjectMatch[1].trim();
          aiBody = aiBody.replace(subjectMatch[0], "").trim();
      }
      
      let finalHtml = wizardHtml;
      
      if (aiSubject) {
          finalHtml = finalHtml.split("[SUBJECT]").join(aiSubject);
      }'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated prompt using regex.")
