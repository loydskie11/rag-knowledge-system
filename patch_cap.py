import re

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "r", encoding="utf-8") as f:
    content = f.read()

strikethrough_btn = """                        <button type="button" onMouseDown={(e) => { e.preventDefault(); applyFormattingCommand("strikeThrough"); }} className={`p-1.5 rounded ${activeStyles.strike ? "text-[#dd7230] font-bold" : "text-[#374151] hover:text-[#dd7230]"}`}>
                          <Strikethrough className={`h-4 w-4 ${activeStyles.strike ? "stroke-[3.4]" : "stroke-[2]"}`} />
                        </button>"""

uppercase_btn = """
                        <button 
                          type="button" 
                          onMouseDown={(e) => { 
                            e.preventDefault(); 
                            const sel = window.getSelection();
                            if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
                            const range = sel.getRangeAt(0);
                            const text = range.toString();
                            if (!text) return;
                            const isUpper = text === text.toUpperCase();
                            const transformed = isUpper ? text.toLowerCase() : text.toUpperCase();
                            document.execCommand("insertText", false, transformed);
                            setTimeout(() => {
                              saveHistorySnapshotFromDom();
                              syncAllPageState();
                            }, 50);
                          }} 
                          className="p-1.5 rounded text-[#374151] hover:text-[#dd7230]"
                          title="Toggle Uppercase/Lowercase"
                        >
                          <Type className="h-4 w-4 stroke-[2]" />
                        </button>
"""

new_content = content.replace(strikethrough_btn, strikethrough_btn + uppercase_btn)

# We need to make sure `Type` icon is imported from "lucide-react"
import_line = 'import { ArrowLeft, ArrowRight, BookOpen, Search, Filter, Loader2, Play, Plus, Clock, Upload, X, Check, Save, Image as ImageIcon, Download, Trash2, Printer, CheckCircle2, AlertCircle, ChevronDown, AlignLeft, AlignCenter, AlignRight, AlignJustify, Bold, Italic, Underline as UnderlineIcon, Strikethrough, List, ListOrdered, Undo, Sparkles, Wand2, ChevronUp } from "lucide-react";'
new_import = import_line.replace('Strikethrough,', 'Strikethrough, Type,')

if import_line in new_content:
    new_content = new_content.replace(import_line, new_import)
else:
    # If the line differs slightly, let's just do a regex replace to add Type
    new_content = re.sub(r'(import \{[^}]+)Strikethrough,([^}]+from "lucide-react";)', r'\1Strikethrough, Type,\2', new_content)

with open(r"c:\Projects\rag-governance\src\app\pages\DocumentGenerator.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print("Added Capitalization button!")
