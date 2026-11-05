import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# I will replace from `const [wizardPlaceholders` up to `// --- WIZARD UI HERE ---` or end of `handleWizardGenerate`
# Actually, I can just replace `wizardPlaceholders` state type:
# from: `const [wizardPlaceholders, setWizardPlaceholders] = useState<string[]>([]);`
# to: `const [wizardPlaceholders, setWizardPlaceholders] = useState<{norm: string, exact: string[]}[]>([]);`

# Let's write a targeted patch.
start_replace = content.find('  const [wizardPlaceholders, setWizardPlaceholders] = useState<string[]>([]);')
end_replace = content.find('  const handleLineSpacingChange =', start_replace)

if start_replace != -1 and end_replace != -1:
    new_code = """  const [wizardPlaceholders, setWizardPlaceholders] = useState<{norm: string, exact: string[]}[]>([]);
  const [wizardForm, setWizardForm] = useState<Record<string, string>>({});
  const [wizardLoading, setWizardLoading] = useState(false);
  
  useEffect(() => {
    let active = true;
    apiClient.get("/documents", { params: { category: "Template" } }).then(res => {
      if (active && Array.isArray(res.data)) {
        const filtered = res.data.filter(d => 
          d.category === "Template" || 
          d.category === "Accreditation Evidence" || 
          (d.name && d.name.toUpperCase().includes("TEMPLATE"))
        );
        setTemplates(filtered);
      }
    }).catch(console.error);
    return () => { active = false; };
  }, []);
  
  const handleWizardTemplateSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tName = e.target.value;
    if (!tName) {
      setWizardTemplate(null);
      setWizardHtml("");
      setWizardPlaceholders([]);
      setWizardForm({});
      return;
    }
    const t = templates.find(x => x.name === tName);
    setWizardTemplate(t || null);
    if (!t) return;
    
    setWizardLoading(true);
    try {
      const url = `/documents/${encodeURIComponent(tName)}/content`;
      const resp = await apiClient.get(url);
      const payload = resp.data;
      if (payload && payload.content_html) {
        setWizardHtml(payload.content_html);
        
        const clean = payload.content_html.replace(/<[^>]+>/g, "");
        const matches = clean.match(/\\[.*?\\]/g) || [];
        const unique = Array.from(new Set(matches)) as string[];
        
        // Exclude body/content placeholders
        const fields = unique.filter(x => !x.toLowerCase().includes("body") && !x.toLowerCase().includes("content") && !x.toLowerCase().includes("prompt"));
        
        // Group by normalized name so "Sender Name" and "SENDER NAME" don't show up twice
        const groups: Record<string, string[]> = {};
        for (const ph of fields) {
            let norm = ph.replace(/\\[|\\]/g, "").replace(/^(insert\\s+)/i, "").trim().toLowerCase();
            // clean up weird characters from bad OCR or artifacts
            norm = norm.replace(/[^a-z0-9\\s,]/gi, "").trim();
            if (!groups[norm]) groups[norm] = [];
            groups[norm].push(ph);
        }
        
        const groupedPlaceholders = Object.keys(groups).map(k => ({ norm: k, exact: groups[k] }));
        
        setWizardPlaceholders(groupedPlaceholders);
        setWizardForm({});
        setPrompt("");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to load template HTML.");
    } finally {
      setWizardLoading(false);
    }
  };
  
  const handleWizardGenerate = async () => {
    if (!wizardTemplate) return;
    setStatus("generating");
    setErrorMessage(null);
    try {
      const targetPages = 1;
      const WORDS_PER_PAGE = 275;
      const pagePromptInstruction = "CRITICAL: The generated text MUST FIT ON EXACTLY ONE (1) PAGE. Aim for 250-300 words total, no more. Be concise and executive.";
      
      const fullPromptPayload = `I need you to generate the MAIN BODY CONTENT for this document.
Instructions: ${prompt}
${pagePromptInstruction}
IMPORTANT: Output ONLY the paragraphs of the body. Do not output any Markdown, no headers, no To/From/Date (I already have those). Just the raw text/HTML for the body paragraphs.`;

      const resp = await apiClient.post("/generate-document", { prompt: fullPromptPayload, targetPages });
      const aiBody = resp.data.content || "";
      
      let finalHtml = wizardHtml;
      
      // 1. Map grouped form fields using split/join to avoid RegExp escaping issues entirely!
      for (const group of wizardPlaceholders) {
        const val = wizardForm[group.norm];
        for (const exactPh of group.exact) {
            // If they left it completely blank, just keep the placeholder so they can edit it later
            const replaceVal = (val !== undefined && val.trim() !== "") ? val : exactPh;
            finalHtml = finalHtml.split(exactPh).join(replaceVal);
        }
      }
      
      // 2. Map AI Body
      const clean = wizardHtml.replace(/<[^>]+>/g, "");
      const matches = clean.match(/\\[.*?\\]/g) || [];
      const unique = Array.from(new Set(matches)) as string[];
      const bodyPh = unique.find(x => x.toLowerCase().includes("body") || x.toLowerCase().includes("content") || x.toLowerCase().includes("prompt"));
      
      if (bodyPh) {
        finalHtml = finalHtml.split(bodyPh).join(aiBody);
      } else {
        finalHtml += `<br/><br/>${aiBody}`;
      }
      
      historyStackRef.current = [finalHtml];
      historyIndexRef.current = 0;
      setActiveTemplateId(wizardTemplate.name);
      setStatus("success");
      setView("editor");
      loadHtmlIntoPreview(finalHtml);
      
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : "Generation failed.");
      setStatus("error");
    }
  };

"""
    # Fix the double slashes for python raw string
    new_code = new_code.replace("\\\\[", "\\[").replace("\\\\]", "\\]").replace("\\\\s", "\\s")

    content = content[:start_replace] + new_code + content[end_replace:]
    with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched script functions successfully!")
else:
    print("Could not find boundaries")
