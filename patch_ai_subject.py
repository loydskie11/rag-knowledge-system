import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Update the prompt and mapping
old_prompt = """      try {
        const targetPages = 1;
        const WORDS_PER_PAGE = 275;
        const pagePromptInstruction = "CRITICAL: The generated text MUST FIT ON EXACTLY ONE (1) PAGE. Aim for 250-300 words total, no more. Be concise and executive.";
        
        const fullPromptPayload = `I need you to generate the MAIN BODY CONTENT for this document.
Instructions: ${prompt}
${pagePromptInstruction}
IMPORTANT: Output ONLY the paragraphs of the body. Do not output any Markdown, no headers, no To/From/Date (I already have those). Just the raw text/HTML for the body paragraphs.`;

        const resp = await apiClient.post("/generate-document", { prompt: fullPromptPayload, targetPages });
        const aiBody = resp.data.content || "";
        
        let finalHtml = wizardHtml;"""

new_prompt = """      try {
        const targetPages = 1;
        const WORDS_PER_PAGE = 275;
        const pagePromptInstruction = "CRITICAL: The generated text MUST FIT ON EXACTLY ONE (1) PAGE. Aim for 250-300 words total, no more. Be concise and executive.";
        
        const fullPromptPayload = `I need you to generate the MAIN BODY CONTENT and a SUBJECT for this document.
Instructions: ${prompt}
${pagePromptInstruction}
IMPORTANT: Output the subject on the very first line prefixed with "SUBJECT:", followed by an empty line, then the raw text/HTML paragraphs of the body. Do not output any Markdown blockticks or other headers.`;

        const resp = await apiClient.post("/generate-document", { prompt: fullPromptPayload, targetPages });
        let aiBody = resp.data.content || "";
        let aiSubject = "";
        
        // Parse the generated SUBJECT: line
        const subjectMatch = aiBody.match(/^SUBJECT:\s*(.*?)(?:\n|<br>)/i);
        if (subjectMatch) {
            aiSubject = subjectMatch[1].trim();
            aiBody = aiBody.replace(subjectMatch[0], "").trim();
        }
        
        let finalHtml = wizardHtml;
        
        // Map AI generated subject to [SUBJECT] if present
        if (aiSubject) {
            finalHtml = finalHtml.split("[SUBJECT]").join(aiSubject);
        }"""

content = content.replace(old_prompt, new_prompt)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated prompt and subject mapping.")
