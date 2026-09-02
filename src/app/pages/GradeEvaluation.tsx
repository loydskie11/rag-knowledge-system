import { useState, useRef } from "react";
import { Upload, FileText, AlertCircle, CheckCircle, TrendingUp, Loader2, Award, Calendar, BookOpen, AlertTriangle, Calculator, ChevronDown, ChevronUp, X } from "lucide-react";
import axios from "axios";

interface SubjectScratchpad {
  subject: string;
  units: number;
  grade: number;
  weighted_score: number;
}

interface SemesterData {
  semester_name: string;
  has_missing_grades: boolean;
  subjects_scratchpad?: SubjectScratchpad[];
}

interface EvaluationResult {
  semesters: SemesterData[];
  summary: string;
  recommendations: string[];
}

export function GradeEvaluation() {
  const [isDragging, setIsDragging] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [expandedSemesters, setExpandedSemesters] = useState<number[]>([]);

  const toggleSemester = (index: number) => {
    setExpandedSemesters(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  };

  // --- DETERMINISTIC REACT MATH ENGINE ---
  const getAccurateMath = (semester: SemesterData) => {
    if (!semester.subjects_scratchpad || semester.subjects_scratchpad.length === 0) {
      return { gwa: "N/A", totalUnits: "0", status: "Unknown" };
    }

    let totalUnits = 0;
    let totalWeighted = 0;
    let hasFailed = false;

    semester.subjects_scratchpad.forEach(sub => {
      if (sub.grade > 0 && sub.grade <= 5.0) {
        const units = Number(sub.units) || 0;
        const grade = Number(sub.grade) || 0;
        
        totalUnits += units;
        totalWeighted += (units * grade);

        if (grade > 3.0) hasFailed = true;
      }
    });

    if (totalUnits === 0) return { gwa: "N/A", totalUnits: "0", status: "Pending" };

    const calcGwa = (totalWeighted / totalUnits).toFixed(2);
    let status = "Pass";
    if (hasFailed) status = "Fail";
    else if (Number(calcGwa) <= 1.75) status = "Dean's Lister";
    else if (semester.has_missing_grades) status = "Conditional";

    return { gwa: calcGwa, totalUnits: totalUnits.toFixed(1), status };
  };

  const getCumulativeMath = (semesters: SemesterData[]) => {
    let globalUnits = 0;
    let globalWeighted = 0;
    let hasFailed = false;

    semesters.forEach(sem => {
      sem.subjects_scratchpad?.forEach(sub => {
        if (sub.grade > 0 && sub.grade <= 5.0) {
          globalUnits += Number(sub.units);
          globalWeighted += (Number(sub.units) * Number(sub.grade));
          if (sub.grade > 3.0) hasFailed = true;
        }
      });
    });

    if (globalUnits === 0) return { gwa: "N/A", status: "Pending" };
    
    const finalGwa = (globalWeighted / globalUnits).toFixed(2);
    let status = "Pass";
    if (hasFailed) status = "Fail";
    else if (Number(finalGwa) <= 1.75) status = "Dean's Lister";

    return { gwa: finalGwa, status };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setResult(null); setExpandedSemesters([]);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents opening the file dialog
    setSelectedFile(null);
    setResult(null);
    setExpandedSemesters([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submitForEvaluation = async () => {
    if (!selectedFile) return;
    setIsEvaluating(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post("http://localhost:8000/evaluate-grades", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(response.data);
    } catch (error) {
      alert("Failed to evaluate grades. Ensure it is a valid PDF.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "Dean's Lister") return "bg-amber-50 text-amber-800 border border-amber-200/60 font-semibold";
    if (status === "Pass") return "bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-semibold";
    if (status === "Fail") return "bg-rose-50 text-rose-800 border border-rose-200/60 font-semibold";
    return "bg-gray-100 text-gray-800 border border-gray-200 font-semibold";
  };

  const cumulativeData = result && Array.isArray(result.semesters) ? getCumulativeMath(result.semesters) : { gwa: "N/A", status: "Unknown" };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Grade Evaluation</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Upload your CTU grade slip for instant academic analysis and GWA verification.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        {/* --- UPLOAD SECTION --- */}
        <div className="lg:col-span-1 space-y-4 sticky top-6 self-start">
          <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden">
            <div className="p-3.5 bg-gray-50/80 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-xs flex items-center gap-2">
                <Upload className="h-3.5 w-3.5 text-[#DD7230]" /> Document Upload
              </h3>
            </div>
            
            <div className="p-5">
              <div 
                onDragOver={(e) => {e.preventDefault(); setIsDragging(true)}}
                onDragLeave={(e) => {e.preventDefault(); setIsDragging(false)}}
                onDrop={handleDrop}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  selectedFile ? "border-transparent bg-transparent p-0" : 
                  isDragging ? "border-[#DD7230] bg-orange-50/30 cursor-pointer" : "border-gray-200 hover:border-gray-300 bg-gray-50/50 cursor-pointer"
                }`}
              >
                {/* FILE DISPLAY WITH CLOSE ICON */}
                {selectedFile ? (
                  <div className="relative flex flex-col items-center p-4 border border-gray-200 bg-gray-50/50 rounded-xl group transition-all">
                    <button 
                      onClick={handleRemoveFile}
                      className="absolute top-2.5 right-2.5 p-1 bg-white text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-gray-200 transition-all cursor-pointer"
                      title="Remove PDF"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="p-2.5 bg-white rounded-lg border border-gray-200 mb-2">
                      <FileText className="h-6 w-6 text-[#DD7230]" />
                    </div>
                    <p className="text-xs font-semibold text-gray-900 text-center px-2 truncate w-full">{selectedFile.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <div className="mx-auto w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center mb-3 text-gray-400">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-gray-800">Click or drag PDF grade slip</p>
                    <p className="text-[11px] text-gray-400 mt-1">Supports official CTU grade slip PDF (Max 10MB)</p>
                  </div>
                )}
                <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              </div>

              <button
                onClick={submitForEvaluation}
                disabled={!selectedFile || isEvaluating}
                className="w-full mt-4 py-2.5 bg-[#DD7230] text-white rounded-lg hover:bg-[#DD7230] transition-all disabled:opacity-50 disabled:hover:bg-[#DD7230] flex justify-center items-center gap-2 text-xs font-semibold shadow-2xs cursor-pointer active:scale-95"
              >
                {isEvaluating ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing Grades...</> : "Evaluate Performance"}
              </button>

              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  <span className="font-medium text-gray-700 block">Privacy Guarantee</span>
                  Uploaded grades are processed ephemerally in RAM and are never permanently stored.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- RESULTS SECTION --- */}
        <div className="lg:col-span-2">
          {isEvaluating ? (
            <div className="bg-white rounded-xl shadow-2xs border border-gray-200 h-full min-h-[460px] flex flex-col items-center justify-center p-8 text-center">
              <Loader2 className="h-8 w-8 text-[#DD7230] animate-spin mb-4" />
              <h3 className="text-base font-semibold text-gray-900">Extracting Academic Data...</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1.5 leading-relaxed">Scanning transcripts and computing weighted averages using deterministic CTU grading mathematics.</p>
            </div>
          ) : result ? (
            <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden h-full animate-in fade-in duration-300">
              <div className="p-6 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                      Academic Evaluation Result
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Official CTU Grading Ruleset Applied</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs tracking-wide font-semibold flex items-center gap-1.5 self-start sm:self-auto ${getStatusBadge(cumulativeData.status)}`}>
                    {cumulativeData.status === "Dean's Lister" && <Award className="h-3.5 w-3.5" />}
                    {cumulativeData.status}
                  </span>
                </div>

                {/* GWA Card */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-gray-50/80 border border-gray-200 rounded-xl mb-6 gap-4">
                  <div className="text-center sm:text-left">
                    <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Total Cumulative GWA</h4>
                    <p className="text-4xl font-extrabold text-gray-900 tracking-tight">{cumulativeData.gwa}</p>
                  </div>
                  <div className="hidden sm:block w-px h-12 bg-gray-200"></div>
                  <div className="text-center sm:text-left max-w-[280px]">
                    <p className="text-xs text-gray-500 leading-relaxed">Calculated natively via deterministic mathematics ensuring 100% precision from extracted AI data.</p>
                  </div>
                </div>

                {Array.isArray(result.semesters) && (
                  <div className="mb-6 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                      Semester Breakdown
                    </h3>
                    
                    {result.semesters.map((sem, idx) => {
                      const math = getAccurateMath(sem); 
                      
                      return (
                        <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4">
                            
                            <div className="flex items-center gap-3 mb-3 sm:mb-0">
                              <div className="bg-gray-100 p-2 rounded-lg text-gray-600">
                                <BookOpen className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="block font-semibold text-gray-900 text-xs sm:text-sm">{sem.semester_name || "Unknown Semester"}</span>
                                <span className="block text-[11px] text-gray-500 mt-0.5">Evaluated Units: {math.totalUnits}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 sm:pl-5 sm:border-l border-gray-100">
                              <div className="text-right">
                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Semester GWA</span>
                                <span className="text-lg font-bold text-gray-900 leading-none">{math.gwa}</span>
                              </div>
                              {Array.isArray(sem.subjects_scratchpad) && (
                                <button 
                                  onClick={() => toggleSemester(idx)} 
                                  className={`p-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                                    expandedSemesters.includes(idx) 
                                      ? 'bg-gray-900 text-white border-gray-900' 
                                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                  }`}
                                  title="Toggle details"
                                >
                                  {expandedSemesters.includes(idx) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* MISSING GRADES BANNER */}
                          {sem.has_missing_grades && (
                            <div className="px-4 py-2 bg-rose-50 border-t border-rose-100 flex items-center gap-2">
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                              <span className="text-[11px] font-medium text-rose-700">Missing or incomplete grades detected in this semester.</span>
                            </div>
                          )}

                          {/* MATH SCRATCHPAD */}
                          {expandedSemesters.includes(idx) && Array.isArray(sem.subjects_scratchpad) && (
                            <div className="border-t border-gray-200 bg-gray-50/50 p-4">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="text-[11px] text-gray-500 border-b border-gray-200 uppercase tracking-wider font-medium">
                                      <th className="pb-2 font-medium">Subject</th>
                                      <th className="pb-2 font-medium text-center">Units</th>
                                      <th className="pb-2 font-medium text-center">Grade</th>
                                      <th className="pb-2 font-medium text-right">Weighted</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200/60">
                                    {sem.subjects_scratchpad.map((item, i) => (
                                      <tr key={i} className={`text-gray-700 hover:bg-white/60 transition-colors ${!item.grade || item.grade === 0 ? 'opacity-50' : ''}`}>
                                        <td className="py-2.5 font-medium text-gray-900 truncate max-w-[180px]">{item.subject}</td>
                                        <td className="py-2.5 text-center text-gray-600">{item.units}</td>
                                        <td className="py-2.5 text-center">
                                          {item.grade > 0 ? (
                                            <span className="font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded text-[11px]">{item.grade}</span>
                                          ) : (
                                            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 rounded">INC</span>
                                          )}
                                        </td>
                                        <td className="py-2.5 text-right font-medium text-gray-500">{(item.units * item.grade).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Advisor Summary */}
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Advisor Summary</h3>
                  <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-200">
                    <p className="text-gray-700 text-xs leading-relaxed">{result.summary || "Summary generation skipped by AI."}</p>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2.5">Recommended Actions</h3>
                  <div className="space-y-2">
                    {Array.isArray(result.recommendations) ? result.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-3 p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs">
                        <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span className="text-gray-700 text-xs leading-relaxed">{rec}</span>
                      </div>
                    )) : <p className="text-xs text-gray-500">AI did not provide recommendations.</p>}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 h-full min-h-[460px] flex items-center justify-center p-8">
               <div className="text-center">
                 <div className="bg-white w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-2xs border border-gray-200 text-gray-400">
                    <FileText className="h-6 w-6" />
                 </div>
                 <h3 className="text-sm font-semibold text-gray-700">Awaiting Grade Slip</h3>
                 <p className="text-xs text-gray-400 mt-1 max-w-[240px] mx-auto">Upload a PDF grade slip to view your verified GWA and academic evaluation.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}