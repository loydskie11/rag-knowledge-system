import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_use_effect = """  const defaultsAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultsAppliedRef.current) return;
    defaultsAppliedRef.current = true;

    (async () => {
      const [defHeader, defFooter] = await Promise.all([
        loadImageAssetFromUrl(DEFAULT_HEADER_URL),
        loadImageAssetFromUrl(DEFAULT_FOOTER_URL),
      ]);

      if (defHeader) setHeaderImage((prev) => prev ?? defHeader);
      if (defFooter) setFooterImage((prev) => prev ?? defFooter);
    })();
  }, []);"""

new_use_effect = """  const defaultsAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultsAppliedRef.current) return;
    defaultsAppliedRef.current = true;

    (async () => {
      try {
        const res = await apiClient.get("/documents", { params: { category: "Branding Asset" } });
        const assets = res.data || [];
        
        const headerDoc = assets.find((a: any) => a.name.toLowerCase().includes("header"));
        const footerDoc = assets.find((a: any) => a.name.toLowerCase().includes("footer"));
        
        const headerUrl = headerDoc ? headerDoc.file_url : DEFAULT_HEADER_URL;
        const footerUrl = footerDoc ? footerDoc.file_url : DEFAULT_FOOTER_URL;

        const [defHeader, defFooter] = await Promise.all([
          loadImageAssetFromUrl(headerUrl).catch(() => null),
          loadImageAssetFromUrl(footerUrl).catch(() => null),
        ]);

        if (defHeader) setHeaderImage((prev) => prev ?? defHeader);
        if (defFooter) setFooterImage((prev) => prev ?? defFooter);
      } catch (err) {
        // fallback
        const [defHeader, defFooter] = await Promise.all([
          loadImageAssetFromUrl(DEFAULT_HEADER_URL).catch(() => null),
          loadImageAssetFromUrl(DEFAULT_FOOTER_URL).catch(() => null),
        ]);
        if (defHeader) setHeaderImage((prev) => prev ?? defHeader);
        if (defFooter) setFooterImage((prev) => prev ?? defFooter);
      }
    })();
  }, []);"""

if old_use_effect in content:
    content = content.replace(old_use_effect, new_use_effect)
    print("Patched DocumentGenerator.tsx useEffect successfully!")
else:
    print("Could not find useEffect in DocumentGenerator.tsx")

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(content)
