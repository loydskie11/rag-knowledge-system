import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Modify handleGenerate to include the template HTML in the prompt
old_generate = """      const targetPages = parseTargetPageCount(prompt);
      const WORDS_PER_PAGE = 275;
      let pagePromptInstruction = "";
      if (targetPages === 1) {
        pagePromptInstruction =
          "CRITICAL: The generated text MUST FIT ON EXACTLY ONE (1) PAGE. " +
          "Aim for 250\u2013300 words total, no more. Be concise and executive \u2014 " +
          "every extra word risks spilling onto a second page.";
      } else if (targetPages !== null && targetPages > 1) {
        const targetWords = targetPages * WORDS_PER_PAGE;
        pagePromptInstruction =
          `PAGE LIMIT: Produce content of approximately ${targetPages} pages ` +
          `(~250\u2013300 words per page, ~${targetWords} words total). Do not exceed this.`;
      }

      const fullPromptPayload = `${prompt}\n\n${pagePromptInstruction} ${headerFooterInfo.join(" ")}`.trim();"""

new_generate = """      const targetPages = parseTargetPageCount(prompt);
      const WORDS_PER_PAGE = 275;
      let pagePromptInstruction = "";
      if (targetPages === 1) {
        pagePromptInstruction =
          "CRITICAL: The generated text MUST FIT ON EXACTLY ONE (1) PAGE. Aim for 250-300 words total, no more. Be concise and executive - every extra word risks spilling onto a second page.";
      } else if (targetPages !== null && targetPages > 1) {
        const targetWords = targetPages * WORDS_PER_PAGE;
        pagePromptInstruction =
          `PAGE LIMIT: Produce content of approximately ${targetPages} pages (~250-300 words per page, ~${targetWords} words total). Do not exceed this.`;
      }

      let fullPromptPayload = "";
      if (entryMode === "template") {
        const currentHtml = historyStackRef.current[historyIndexRef.current] || "";
        fullPromptPayload = `I have a document template below. Fill in ALL the bracketed placeholders based on these instructions: ${prompt}\n\nTEMPLATE CONTENT (in HTML):\n${currentHtml}\n\nCRITICAL: Return ONLY the completely filled out template in the exact same format. Maintain the structure exactly. Do not output markdown code blocks if the input is raw HTML.`;
      } else {
        fullPromptPayload = `${prompt}\n\n${pagePromptInstruction} ${headerFooterInfo.join(" ")}`.trim();
      }"""

content = content.replace(old_generate, new_generate)

# 2. Fix the UI to show the Prompt text area in Template mode!
# Find the exact JSX for the textarea block.
old_textarea = """          {entryMode !== "template" && (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Draft a mandatory memo regarding the midterm exams for all college deans, requiring submission of questionnaires by Friday..."
              className="w-full min-h-[140px] p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[13px] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#dd7230]/30 focus:border-[#dd7230] transition-all resize-none shadow-inner"
            />
          )}"""

new_textarea = """          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={entryMode === "template" ? "e.g., Fill this template out for a faculty meeting on Monday at 9AM regarding midterm exams..." : "e.g., Draft a mandatory memo regarding the midterm exams for all college deans..."}
            className="w-full min-h-[140px] p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[13px] text-[#1F2937] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#dd7230]/30 focus:border-[#dd7230] transition-all resize-none shadow-inner"
          />"""

content = content.replace(old_textarea, new_textarea)

# 3. Fix the New Prompt button behavior to clear entryMode if clicked
old_back_button = """                <button
                  onClick={() => setView(entryMode === "template" ? "templates" : "compose")}
                  className="flex items-center gap-2 px-3.5 py-2 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#374151] transition-all shadow-sm active:scale-95"
                >
                  <ArrowLeft className="h-4 w-4 text-[#dd7230]" />
                  <span>{entryMode === "template" ? "Back to Repository" : "New Prompt"}</span>
                </button>"""

new_back_button = """                <button
                  onClick={() => {
                    setView(entryMode === "template" ? "templates" : "compose");
                    if (entryMode !== "template") setPrompt("");
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#374151] transition-all shadow-sm active:scale-95"
                >
                  <ArrowLeft className="h-4 w-4 text-[#dd7230]" />
                  <span>{entryMode === "template" ? "Back to Templates" : "New Prompt"}</span>
                </button>"""
content = content.replace(old_back_button, new_back_button)

# Also fix the prompt state in loadRepositoryDocument so it doesn't overwrite user's typed prompt with the template name
old_set_prompt = 'setPrompt(payload.name || doc.name);'
new_set_prompt = 'setPrompt("");'
content = content.replace(old_set_prompt, new_set_prompt)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched UI and Logic!")
