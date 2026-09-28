import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update states at the top of DocumentGenerator
states_old = """  const [view, setView] = useState<AppView>("chooser");
  const [entryMode, setEntryMode] = useState<"ai" | "template">("ai");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("");
"""

states_new = """  const [view, setView] = useState<"wizard" | "editor">("wizard");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  
  // Wizard states
  const [templates, setTemplates] = useState<any[]>([]);
  const [wizardTemplate, setWizardTemplate] = useState<any | null>(null);
  const [wizardHtml, setWizardHtml] = useState<string>("");
  const [wizardPlaceholders, setWizardPlaceholders] = useState<string[]>([]);
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
        
        // Find placeholders [Like This]
        // But strip HTML tags first just in case
        const clean = payload.content_html.replace(/<[^>]+>/g, "");
        const matches = clean.match(/\[.*?\]/g) || [];
        const unique = Array.from(new Set(matches)) as string[];
        
        // We will exclude any placeholder that sounds like "Body" or "Content" 
        // because that's what the AI prompt will generate.
        const fields = unique.filter(x => !x.toLowerCase().includes("body") && !x.toLowerCase().includes("content") && !x.toLowerCase().includes("prompt"));
        
        setWizardPlaceholders(fields);
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
      
      // Now map fields to HTML!
      let finalHtml = wizardHtml;
      
      // 1. Map form fields
      for (const ph of wizardPlaceholders) {
        const val = wizardForm[ph] || ph;
        // Global replace (escape brackets)
        const regex = new RegExp(ph.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g');
        finalHtml = finalHtml.replace(regex, val);
      }
      
      // 2. Map AI Body
      // Find the placeholder that was excluded
      const clean = wizardHtml.replace(/<[^>]+>/g, "");
      const matches = clean.match(/\[.*?\]/g) || [];
      const unique = Array.from(new Set(matches)) as string[];
      const bodyPh = unique.find(x => x.toLowerCase().includes("body") || x.toLowerCase().includes("content") || x.toLowerCase().includes("prompt"));
      
      if (bodyPh) {
        const regex = new RegExp(bodyPh.replace(/\[/g, '\\[').replace(/\]/g, '\\]'), 'g');
        finalHtml = finalHtml.replace(regex, aiBody);
      } else {
        // Just append it if no placeholder found
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

content = content.replace(states_old, states_new)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated states")
