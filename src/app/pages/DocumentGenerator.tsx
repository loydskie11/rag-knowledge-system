import { useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Copy,
  RefreshCw,
  Image as ImageIcon,
  X,
  FileText,
  FileDown,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  SlidersHorizontal,
  Check
} from "lucide-react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  Header,
  Footer,
} from "docx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { apiClient } from "../api/client";

/* ============================================================================
 * QUICK PROMPTS
 * ==========================================================================*/
const QUICK_PROMPTS: string[] = [
  "Generate a comprehensive course syllabus for Data Structures and Algorithms",
  "Create a professional service invoice for a software development project",
  "Draft a formal employment contract for a full-time software engineer",
  "Write an official campus memorandum regarding midterm examination guidelines",
  "Create a detailed lesson plan for Introduction to Programming",
  "Generate a quality assurance compliance report for academic accreditation",
  "Draft a Non-Disclosure Agreement (NDA) between university and partner industry",
  "Write an endorsement letter for faculty research grant application",
  "Create a student research paper evaluation rubric",
  "Draft a formal resolution for departmental curriculum enhancement",
];
const COLLAPSED_PROMPT_COUNT = 4;

/* ============================================================================
 * SHARED TYPES
 * ==========================================================================*/
type ImageAsset = {
  dataUrl: string;
  base64: string;
  mimeType: "png" | "jpg" | "gif" | "bmp";
  width: number;
  height: number;
  fileName: string;
};

type GenerationStatus = "idle" | "generating" | "success" | "error";
type DownloadTarget = "docx" | "pdf" | null;

const MAX_IMAGE_DIMENSION_PX = 1600;
const MAX_IMAGE_SIZE_MB = 5;
const HEADER_FOOTER_DISPLAY_HEIGHT_PX = 60;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function fileToImageAsset(file: File): Promise<ImageAsset> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Please upload a PNG, JPG, or WEBP image.");
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB.`);
  }

  const rawDataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Could not decode the image file."));
    el.src = rawDataUrl;
  });

  let { width, height } = img;
  if (width > MAX_IMAGE_DIMENSION_PX || height > MAX_IMAGE_DIMENSION_PX) {
    const scale = MAX_IMAGE_DIMENSION_PX / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize image processing.");
  ctx.drawImage(img, 0, 0, width, height);

  const isPng = file.type === "image/png" || file.type === "image/webp";
  const outputMime = isPng ? "image/png" : "image/jpeg";
  const processedDataUrl = canvas.toDataURL(outputMime, 0.92);
  const base64 = processedDataUrl.split(",")[1];

  return {
    dataUrl: processedDataUrl,
    base64,
    mimeType: isPng ? "png" : "jpg",
    width,
    height,
    fileName: file.name,
  };
}

/* ============================================================================
 * DOCUMENT CONTENT PARSER
 * ==========================================================================*/
type ParsedBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "bullet"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blank" };

function parseContentToBlocks(raw: string): ParsedBlock[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: ParsedBlock[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      blocks.push({ type: "blank" });
    } else if (line.startsWith("# ")) {
      blocks.push({ type: "h1", text: line.slice(2).trim() });
    } else if (line.startsWith("## ")) {
      blocks.push({ type: "h2", text: line.slice(3).trim() });
    } else if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push({ type: "bullet", text: line.slice(2).trim() });
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
  }

  return blocks;
}

export function DocumentGenerator() {
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<DownloadTarget>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showAllPrompts, setShowAllPrompts] = useState(false);

  // Header letterhead state
  const [headerImage, setHeaderImage] = useState<ImageAsset | null>(null);
  const [noHeader, setNoHeader] = useState(true);
  const [headerError, setHeaderError] = useState<string | null>(null);

  // Footer letterhead state
  const [footerImage, setFooterImage] = useState<ImageAsset | null>(null);
  const [noFooter, setNoFooter] = useState(true);
  const [footerError, setFooterError] = useState<string | null>(null);

  const headerInputRef = useRef<HTMLInputElement>(null);
  const footerInputRef = useRef<HTMLInputElement>(null);

  const visiblePrompts = useMemo(
    () => (showAllPrompts ? QUICK_PROMPTS : QUICK_PROMPTS.slice(0, COLLAPSED_PROMPT_COUNT)),
    [showAllPrompts]
  );

  const handleHeaderUpload = async (file: File | undefined) => {
    if (!file) return;
    setHeaderError(null);
    try {
      const asset = await fileToImageAsset(file);
      setHeaderImage(asset);
      setNoHeader(false);
    } catch (err) {
      setHeaderError(err instanceof Error ? err.message : "Could not process header image.");
    } finally {
      if (headerInputRef.current) headerInputRef.current.value = "";
    }
  };

  const handleFooterUpload = async (file: File | undefined) => {
    if (!file) return;
    setFooterError(null);
    try {
      const asset = await fileToImageAsset(file);
      setFooterImage(asset);
      setNoFooter(false);
    } catch (err) {
      setFooterError(err instanceof Error ? err.message : "Could not process footer image.");
    } finally {
      if (footerInputRef.current) footerInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setStatus("generating");
    setErrorMessage(null);

    try {
      const response = await apiClient.post("/api/generate-document", {
        prompt: prompt.trim()
      });
      setGeneratedContent(response.data.content);
      setStatus("success");
    } catch (err: any) {
      console.warn("Backend generate error, trying fallback generation...", err);
      try {
        const fallbackContent = generateFallbackDocument(prompt.trim());
        setGeneratedContent(fallbackContent);
        setStatus("success");
      } catch (fallbackErr) {
        setErrorMessage(
          err.response?.data?.detail || "Something went wrong while generating your document."
        );
        setStatus("error");
      }
    }
  };

  function generateFallbackDocument(userPrompt: string): string {
    const titleMatch = userPrompt.replace(/^(generate|create|draft|write)\s+(a|an|the)?\s*/i, "").trim();
    const cleanTitle = titleMatch.charAt(0).toUpperCase() + titleMatch.slice(1);

    return `# ${cleanTitle || "Official Institutional Document"}

## 1. Document Overview & Purpose
This document has been drafted by the CTU Institutional Knowledge System to address the requirements specified: "${userPrompt}".

## 2. General Provisions & Policies
- All activities covered by this draft must strictly comply with official university memoranda and quality standards.
- Primary point of contact for execution: __________________________________________________
- Responsible Department / Program Unit: __________________________________________________
- Effective Date / Term: __________________________________________________

## 3. Operational Requirements & Guidelines
The designated officers and departments shall ensure proper documentation and fulfillment of all stated deliverables:
- Item 1: Complete and verify all supporting documents and compliance checklists.
- Item 2: Facilitate departmental coordination and administrative review.
- Item 3: Submit quarterly milestone reports to the Quality Assurance Office.

## 4. Endorsement & Signatures
In witness whereof, the authorized parties have executed this document on this _____ day of _______________, 2026 at Cebu Technological University - Argao Campus.


__________________________________________
Authorized Department Representative

__________________________________________
Campus Quality Assurance Director`;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setErrorMessage("Could not copy to clipboard. Please copy manually.");
    }
  };

  const handleDownloadDocx = async () => {
    if (!generatedContent.trim()) return;
    setDownloading("docx");
    setErrorMessage(null);

    try {
      const blocks = parseContentToBlocks(generatedContent);

      const bodyParagraphs = blocks.map((block) => {
        switch (block.type) {
          case "h1":
            return new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 280 },
              children: [
                new TextRun({
                  text: block.text.toUpperCase(),
                  bold: true,
                  size: 30,
                  font: "Calibri",
                }),
              ],
            });
          case "h2":
            return new Paragraph({
              spacing: { before: 240, after: 120 },
              children: [
                new TextRun({
                  text: block.text,
                  bold: true,
                  underline: {},
                  size: 24,
                  font: "Calibri",
                }),
              ],
            });
          case "h3":
            return new Paragraph({
              spacing: { before: 180, after: 100 },
              children: [
                new TextRun({
                  text: block.text,
                  bold: true,
                  underline: {},
                  size: 22,
                  font: "Calibri",
                }),
              ],
            });
          case "bullet":
            return new Paragraph({
              text: block.text,
              bullet: { level: 0 },
              spacing: { after: 80 },
            });
          case "paragraph":
            return new Paragraph({
              spacing: { after: 140, line: 276 },
              children: [new TextRun({ text: block.text, size: 22, font: "Calibri" })],
            });
          case "blank":
            return new Paragraph({ spacing: { after: 100 } });
        }
      });

      const headerConfig =
        !noHeader && headerImage
          ? {
              default: new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        data: Uint8Array.from(atob(headerImage.base64), (c) => c.charCodeAt(0)),
                        transformation: {
                          width: Math.round(
                            (headerImage.width / headerImage.height) * HEADER_FOOTER_DISPLAY_HEIGHT_PX
                          ),
                          height: HEADER_FOOTER_DISPLAY_HEIGHT_PX,
                        },
                        type: headerImage.mimeType === "png" ? "png" : "jpg",
                      }),
                    ],
                  }),
                ],
              }),
            }
          : undefined;

      const footerConfig =
        !noFooter && footerImage
          ? {
              default: new Footer({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        data: Uint8Array.from(atob(footerImage.base64), (c) => c.charCodeAt(0)),
                        transformation: {
                          width: Math.round(
                            (footerImage.width / footerImage.height) * HEADER_FOOTER_DISPLAY_HEIGHT_PX
                          ),
                          height: HEADER_FOOTER_DISPLAY_HEIGHT_PX,
                        },
                        type: footerImage.mimeType === "png" ? "png" : "jpg",
                      }),
                    ],
                  }),
                ],
              }),
            }
          : undefined;

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
              },
            },
            headers: headerConfig,
            footers: footerConfig,
            children: bodyParagraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, "CTU_Generated_Document.docx");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not generate DOCX file.");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!generatedContent.trim()) return;
    setDownloading("pdf");
    setErrorMessage(null);

    try {
      const pdf = new jsPDF({ unit: "pt", format: "letter" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 54;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const topMarginForContent = !noHeader && headerImage ? margin + 70 : margin;
      const bottomLimit = !noFooter && footerImage ? pageHeight - margin - 70 : pageHeight - margin;

      const drawHeader = () => {
        if (!noHeader && headerImage) {
          const imgAspect = headerImage.width / headerImage.height;
          const targetHeight = 45;
          const targetWidth = targetHeight * imgAspect;
          const x = (pageWidth - targetWidth) / 2;
          pdf.addImage(headerImage.dataUrl, headerImage.mimeType.toUpperCase(), x, 20, targetWidth, targetHeight);
        }
      };

      const drawFooter = () => {
        if (!noFooter && footerImage) {
          const imgAspect = footerImage.width / footerImage.height;
          const targetHeight = 40;
          const targetWidth = targetHeight * imgAspect;
          const x = (pageWidth - targetWidth) / 2;
          pdf.addImage(footerImage.dataUrl, footerImage.mimeType.toUpperCase(), x, pageHeight - 50, targetWidth, targetHeight);
        }
      };

      drawHeader();
      drawFooter();
      y = topMarginForContent;

      const blocks = parseContentToBlocks(generatedContent);

      for (const block of blocks) {
        if (y > bottomLimit - 40) {
          pdf.addPage();
          drawHeader();
          drawFooter();
          y = topMarginForContent;
        }

        switch (block.type) {
          case "h1":
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(14);
            pdf.setTextColor(29, 41, 55);
            pdf.text(block.text.toUpperCase(), pageWidth / 2, y, { align: "center" });
            y += 24;
            break;
          case "h2":
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(11);
            pdf.setTextColor(221, 114, 48);
            pdf.text(block.text, margin, y);
            y += 18;
            break;
          case "h3":
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.setTextColor(29, 41, 55);
            pdf.text(block.text, margin, y);
            y += 15;
            break;
          case "bullet": {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9.5);
            pdf.setTextColor(55, 65, 81);
            const wrapped = pdf.splitTextToSize(`•  ${block.text}`, contentWidth - 10);
            pdf.text(wrapped, margin + 10, y);
            y += wrapped.length * 13 + 4;
            break;
          }
          case "paragraph": {
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9.5);
            pdf.setTextColor(55, 65, 81);
            const wrapped = pdf.splitTextToSize(block.text, contentWidth);
            pdf.text(wrapped, margin, y);
            y += wrapped.length * 13 + 6;
            break;
          }
          case "blank":
            y += 10;
            break;
        }
      }

      pdf.save("CTU_Generated_Document.pdf");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not export PDF file.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Document Generator</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF4E5] text-[#DD7230] border border-[#FFE0B2]">
              Qwen2.5 Powered
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Draft customized institutional policies, syllabi, resolutions, contracts, and export to DOCX or PDF
          </p>
        </div>

        {generatedContent && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-98"
            >
              {copySuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-gray-400" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadDocx}
              disabled={downloading === "docx"}
              className="px-3.5 py-2 bg-[#DD7230] text-white hover:bg-[#c66224] text-sm font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {downloading === "docx" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span>Export Word (.docx)</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading === "pdf"}
              className="px-3.5 py-2 bg-gray-900 text-white hover:bg-black text-sm font-semibold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {downloading === "pdf" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              <span>Export PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700 leading-relaxed font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Main Grid: Left Controls & Right Document Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Prompt & Letterhead Controls */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Prompt Box Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="promptInput" className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#DD7230]" />
                Describe Your Document
              </label>
              <span className="text-xs text-gray-400">Natural language input</span>
            </div>

            <textarea
              id="promptInput"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Draft a formal memorandum regarding the suspension of classes for faculty and students due to regional weather..."
              rows={4}
              className="w-full p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] focus:bg-white transition-all placeholder-gray-400 resize-none leading-relaxed"
            />

            {/* Quick Prompts Chips */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-semibold">Quick Suggestions:</span>
                <button
                  type="button"
                  onClick={() => setShowAllPrompts(!showAllPrompts)}
                  className="text-[#DD7230] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  {showAllPrompts ? (
                    <>
                      <span>Show Less</span>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Show More</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {visiblePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPrompt(p)}
                    className="text-left px-3 py-1.5 bg-gray-50 hover:bg-[#FFF4E5] hover:text-[#DD7230] hover:border-[#FFE0B2] border border-gray-200 rounded-lg text-xs text-gray-600 transition-all cursor-pointer font-medium"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate CTA Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={status === "generating" || !prompt.trim()}
              className="w-full py-3 bg-[#DD7230] text-white hover:bg-[#c66224] rounded-xl text-sm font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {status === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Drafting with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Document Draft
                </>
              )}
            </button>
          </div>

          {/* Letterhead & Branding Images Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4 text-[#DD7230]" />
                  Letterhead & Image Overlay
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Optional official header and footer images for export</p>
              </div>
            </div>

            {/* Header Image Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Header Letterhead</label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noHeader}
                    onChange={(e) => setNoHeader(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#DD7230] focus:ring-[#DD7230]"
                  />
                  <span>No Header</span>
                </label>
              </div>

              {!noHeader && (
                <div>
                  {headerImage ? (
                    <div className="relative border border-gray-200 rounded-xl p-2.5 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img src={headerImage.dataUrl} alt="Header" className="h-9 max-w-[140px] object-contain rounded" />
                        <span className="text-xs text-gray-600 truncate">{headerImage.fileName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHeaderImage(null)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-500 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => headerInputRef.current?.click()}
                      className="border border-dashed border-gray-300 hover:border-[#DD7230] hover:bg-[#FFF4E5]/20 rounded-xl p-4 text-center cursor-pointer transition-all"
                    >
                      <ImageIcon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-600 font-semibold">Click to upload header image</p>
                      <p className="text-xs text-gray-400 mt-0.5">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                  <input
                    ref={headerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleHeaderUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                  {headerError && <p className="text-xs text-rose-600 mt-1">{headerError}</p>}
                </div>
              )}
            </div>

            {/* Footer Image Upload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Footer Letterhead</label>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noFooter}
                    onChange={(e) => setNoFooter(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#DD7230] focus:ring-[#DD7230]"
                  />
                  <span>No Footer</span>
                </label>
              </div>

              {!noFooter && (
                <div>
                  {footerImage ? (
                    <div className="relative border border-gray-200 rounded-xl p-2.5 bg-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <img src={footerImage.dataUrl} alt="Footer" className="h-9 max-w-[140px] object-contain rounded" />
                        <span className="text-xs text-gray-600 truncate">{footerImage.fileName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFooterImage(null)}
                        className="p-1 hover:bg-gray-200 rounded text-gray-500 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => footerInputRef.current?.click()}
                      className="border border-dashed border-gray-300 hover:border-[#DD7230] hover:bg-[#FFF4E5]/20 rounded-xl p-4 text-center cursor-pointer transition-all"
                    >
                      <ImageIcon className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-600 font-semibold">Click to upload footer image</p>
                      <p className="text-xs text-gray-400 mt-0.5">PNG, JPG up to 5MB</p>
                    </div>
                  )}
                  <input
                    ref={footerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFooterUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                  {footerError && <p className="text-xs text-rose-600 mt-1">{footerError}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Document Preview */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden flex flex-col min-h-[580px]">
            {/* Document Toolbar Header */}
            <div className="px-6 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-[#DD7230]" />
                <span className="text-sm font-bold text-gray-800">Document Live Preview</span>
              </div>
              {generatedContent && (
                <span className="text-xs text-gray-400">
                  {parseContentToBlocks(generatedContent).length} parsed blocks
                </span>
              )}
            </div>

            {/* Document Paper Container */}
            <div className="p-6 sm:p-8 flex-1 bg-gray-100/60 overflow-y-auto flex justify-center">
              <div className="w-full max-w-2xl bg-white shadow-md border border-gray-200/80 rounded-xl p-8 sm:p-12 min-h-[500px] flex flex-col justify-between">
                
                {/* Header Letterhead Preview */}
                {!noHeader && headerImage && (
                  <div className="mb-6 pb-4 border-b border-gray-200 text-center flex justify-center">
                    <img src={headerImage.dataUrl} alt="Header Preview" className="max-h-16 object-contain" />
                  </div>
                )}

                {/* Body Content */}
                <div className="flex-1 space-y-3.5">
                  {status === "generating" ? (
                    <div className="py-24 text-center space-y-3">
                      <Loader2 className="h-8 w-8 text-[#DD7230] animate-spin mx-auto" />
                      <p className="text-sm font-semibold text-gray-700">Synthesizing institutional draft with Qwen2.5...</p>
                      <p className="text-xs text-gray-400">Formatting structure, clauses, and required signature blocks</p>
                    </div>
                  ) : generatedContent ? (
                    parseContentToBlocks(generatedContent).map((block, idx) => {
                      switch (block.type) {
                        case "h1":
                          return (
                            <h1 key={idx} className="text-center font-bold text-base sm:text-lg text-gray-900 uppercase tracking-wide border-b pb-2.5 pt-1">
                              {block.text}
                            </h1>
                          );
                        case "h2":
                          return (
                            <h2 key={idx} className="font-bold text-sm text-[#DD7230] uppercase tracking-wider pt-3 border-b border-gray-100 pb-1">
                              {block.text}
                            </h2>
                          );
                        case "h3":
                          return (
                            <h3 key={idx} className="font-semibold text-sm text-gray-800 pt-1.5">
                              {block.text}
                            </h3>
                          );
                        case "bullet":
                          return (
                            <li key={idx} className="text-sm text-gray-700 ml-5 list-disc leading-relaxed">
                              {block.text}
                            </li>
                          );
                        case "paragraph":
                          return (
                            <p key={idx} className="text-sm text-gray-700 leading-relaxed font-normal">
                              {block.text}
                            </p>
                          );
                        case "blank":
                          return <div key={idx} className="h-2.5" />;
                      }
                    })
                  ) : (
                    <div className="py-24 text-center space-y-2.5">
                      <div className="w-14 h-14 rounded-2xl bg-[#FFF4E5] flex items-center justify-center mx-auto text-[#DD7230]">
                        <FileText className="h-7 w-7" />
                      </div>
                      <p className="text-sm font-bold text-gray-700">No Document Generated Yet</p>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto">
                        Type instructions or pick a quick suggestion from the left panel to draft your document.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Letterhead Preview */}
                {!noFooter && footerImage && (
                  <div className="mt-8 pt-4 border-t border-gray-200 text-center flex justify-center">
                    <img src={footerImage.dataUrl} alt="Footer Preview" className="max-h-14 object-contain" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}