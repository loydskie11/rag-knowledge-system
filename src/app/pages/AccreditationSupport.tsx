import { useState, useEffect, useRef, useMemo } from "react";
import { Search, CheckCircle, CheckCircle2, AlertCircle, FileText, Award, Target, Upload, ChevronDown, ChevronUp, X, Loader2, ArrowLeft, Archive, Eye, ShieldAlert, Lock, Check, FileCheck, MessageSquareWarning, MessageSquare, Clock, BarChart2, Calendar, Plus, Edit, Trash2, Download, ExternalLink, FileBadge, History, TrendingUp, Building, Sparkles, Users, Layers, AlertTriangle, SlidersHorizontal } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import axios from "axios";
import { ISO_OFFICES_16 } from "./UsersRoles";
import { apiClient } from "../api/client";

export const MASTER_AACCUP_AREAS = [
  { code: "Area I", title: "Vision, Mission, Goals and Objectives" },
  { code: "Area II", title: "Faculty" },
  { code: "Area III", title: "Curriculum and Instruction" },
  { code: "Area IV", title: "Support to Students" },
  { code: "Area V", title: "Research" },
  { code: "Area VI", title: "Extension and Community Involvement" },
  { code: "Area VII", title: "Library" },
  { code: "Area VIII", title: "Physical Plant and Facilities" },
  { code: "Area IX", title: "Laboratories" },
  { code: "Area X", title: "Administration" },
];

// Module-level caches to avoid redundant fetching and keep tab switches and page navigations instant
const isoRequirementsCache = new Map<string, any[]>();
const iqaDaysCache = new Map<string, any[]>();
const qmsPlansCache = new Map<string, any[]>();
let isoCyclesCache: string[] | null = null;

export const getIsoProcessCategory = (req: any): string => {
  if (req?.process_category) return req.process_category;
  const office = (req?.auditee_office || "").toLowerCase();
  if (
    office.includes("educational") ||
    office.includes("instruction") ||
    office.includes("academic") ||
    office.includes("research") ||
    office.includes("extension") ||
    office.includes("production") ||
    office.includes("library") ||
    office.includes("student affairs") ||
    office.includes("registrar")
  ) {
    return "Core Process";
  }
  if (
    office.includes("management") ||
    office.includes("director") ||
    office.includes("leadership") ||
    office.includes("quality") ||
    office.includes("drrm") ||
    office.includes("gender")
  ) {
    return "Management Process";
  }
  return "Support Process";
};

export const isOfficeMatch = (reqOffice: string, filterOffice: string): boolean => {
  if (!filterOffice || filterOffice === "all") return true;
  if (!reqOffice) return false;
  if (reqOffice.toLowerCase() === filterOffice.toLowerCase()) return true;

  const normalize = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
  if (normalize(reqOffice) === normalize(filterOffice)) return true;

  const aliases: Record<string, string[]> = {
    "hrmo": ["hr & records management", "hr", "human resources", "hrmo", "hr & records"],
    "finance/budget/accounting/cashier": ["administrative & finance", "finance", "budget", "accounting", "cashier"],
    "student affairs services": ["student affairs & services", "sas", "student affairs"],
    "registrar/mis": ["registrar's office", "registrar", "mis", "mis & information technology unit"],
    "library services": ["university library", "library"],
    "supply/property custodian": ["supply & property unit", "supply", "property"],
    "management/leadership": ["campus director", "management", "leadership"],
    "educational delivery processes": ["academic affairs", "instruction", "curriculum", "director of instruction"],
    "extension": ["extension & community services"],
    "production and resource generation": ["production & resource generation"],
    "research and development": ["research & development"],
    "quality assurance": ["quality assurance & management (qau)", "qau", "quality assurance"],
    "drrm": ["security & physical plant unit", "drrm"]
  };

  const nReq = normalize(reqOffice);
  const nFilter = normalize(filterOffice);

  for (const [canonical, syns] of Object.entries(aliases)) {
    const allNames = [canonical, ...syns].map(normalize);
    if (allNames.includes(nReq) && allNames.includes(nFilter)) {
      return true;
    }
  }

  return false;
};

// ==========================================
// SUB-COMPONENTS FOR TAB CONTENTS
// ==========================================

export const AaccupTabContent = ({
  currentData,
  filteredAreas,
  selectedProgram,
  userRole,
  userIsIqaAuditor,
  isUnassignedFaculty,
  isAdminQueueOpen,
  setIsAdminQueueOpen,
  pendingDocs,
  expandedArea,
  setExpandedArea,
  handleViewDetails,
  areaDetails,
  isLoadingDetails,
  setShowAreaConfigModal,
  setShowUploadModal,
  setUploadTargetArea,
  setUploadForm,
  setShowFeedbackModal,
  setFeedbackDoc,
  setDocToDelete,
  setShowDeleteModal,
  handleAdminReview,
  isReviewing,
  setUpgradeForm,
  setShowUpgradeModal,
  searchQuery,
  setSearchQuery,
  setShowAddAaccupReqModal,
  setNewAaccupReq,
  setEditingAaccupReq,
  setShowEditAaccupReqModal,
  setAaccupReqToDelete,
  setShowDeleteAaccupReqModal
}: any) => {
  return (
    <>
      {/* 100% Compliant: Ready for Official Assessment Banner */}
      {currentData.overall === 100 && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-emerald-900 flex items-center gap-2">
                100% Compliant: Ready for Official Assessment!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-700 mt-0.5">
                All AACCUP parameters and required evidence documents for <strong>{selectedProgram}</strong> have been fully verified and approved.
              </p>
            </div>
          </div>
          {userRole === "ADMIN" && (
            <button
              onClick={() => {
                setUpgradeForm({
                  new_level: "Level II Re-accredited",
                  valid_until_date: "",
                  certificate_url: "",
                  remarks: "Passed 100% internal compliance audit."
                });
                setShowUpgradeModal(true);
              }}
              className="px-4 py-2.5 bg-[#006837] hover:bg-[#00502a] text-white rounded-lg text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Award className="w-4 h-4" />
              Officially Upgrade Level
            </button>
          )}
        </div>
      )}

      {!expandedArea ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Overall Compliance</p>
              <div className="flex items-baseline justify-between mt-1">
                <h3 className="text-2xl font-bold text-gray-900">{currentData.overall}%</h3>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">Verified</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Gaps</p>
              <div className="flex items-baseline justify-between mt-1">
                <h3 className="text-2xl font-bold text-gray-900">{currentData.gaps}</h3>
                <span className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">Missing</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Approved Docs</p>
              <div className="flex items-baseline justify-between mt-1">
                <h3 className="text-2xl font-bold text-gray-900">{currentData.evidence}</h3>
                <span className="text-[11px] text-gray-500">Uploaded</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Active Areas</p>
              <div className="flex items-baseline justify-between mt-1">
                <h3 className="text-2xl font-bold text-gray-900">{currentData.areas.length}</h3>
                <span className="text-[11px] text-gray-500">Scope</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">AACCUP Area Compliance</h2>
                <span className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
                  {currentData.areas.length} {currentData.areas.length === 10 ? "Areas (All 10)" : "Areas (Scoped)"}
                </span>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                {userRole === "ADMIN" && (
                  <button
                    onClick={() => setShowAreaConfigModal(true)}
                    className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-orange-50/50 text-gray-700 hover:text-[#DD7230] rounded-lg text-xs font-medium transition-all cursor-pointer border border-gray-300 hover:border-[#DD7230]/40 shadow-2xs shrink-0"
                    title="Configure Active Areas for Level III / IV Accreditation"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-[#DD7230]" />
                    Area Configuration
                  </button>
                )}
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                  <input
                    type="text"
                    placeholder="Search AACCUP areas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50/60 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  />
                </div>
              </div>
            </div>

            {/* Admin Verification Queue Panel */}
            {(userRole === "ADMIN" || userIsIqaAuditor) && pendingDocs.length > 0 && (
              <div className="mb-6 bg-gray-50/60 border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                <div 
                  onClick={() => setIsAdminQueueOpen(!isAdminQueueOpen)}
                  className="p-3.5 bg-gray-100/60 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 bg-gray-900 text-white rounded-md font-semibold text-xs">
                      {pendingDocs.length}
                    </span>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
                        Pending Faculty Evidence Submissions ({selectedProgram})
                      </h3>
                      <p className="text-xs text-gray-500">Review and verify evidence files submitted by faculty before counting towards compliance.</p>
                    </div>
                  </div>
                  <button className="p-1 hover:bg-white/50 rounded-lg text-gray-500">
                    {isAdminQueueOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>

                {isAdminQueueOpen && (
                  <div className="p-4 space-y-3 border-t border-gray-200 max-h-80 overflow-y-auto">
                    {pendingDocs.map((doc: any, idx: number) => (
                      <div key={idx} className="bg-white p-3.5 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-gray-300 transition-all">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg shrink-0 mt-0.5">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-gray-900 truncate">{doc.name}</span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-medium rounded-md uppercase shrink-0">
                                {doc.area_code}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{doc.requirement_target}</p>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                              <span>Submitted by: <strong className="text-gray-600">{doc.uploaded_by || 'Faculty'}</strong></span>
                              <span>•</span>
                              <span>Office: <strong className="text-gray-600">{doc.office || 'Academic'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleAdminReview(doc.name, "Approved")}
                            disabled={isReviewing}
                            className="px-3 py-1.5 bg-[#DD7230] hover:bg-[#c86324] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => {
                              setFeedbackDoc(doc);
                              setShowFeedbackModal(true);
                            }}
                            disabled={isReviewing}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" /> Request Revision
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAreas.length === 0 ? (
                <div className="col-span-2 py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Target className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold">No active AACCUP areas match your search filter.</p>
                </div>
              ) : (
                filteredAreas.map((area: any) => (
                  <div
                    key={area.id}
                    className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-all hover:shadow-sm bg-white flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 border border-gray-200 font-semibold text-xs rounded-md">
                          {area.code}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
                            area.compliance === 100
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                              : area.compliance >= 50
                              ? "bg-amber-50 text-amber-800 border-amber-200/60"
                              : "bg-rose-50 text-rose-700 border-rose-200/60"
                          }`}
                        >
                          {area.compliance}% Compliant
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-3 group-hover:text-gray-950 transition-colors">
                        {area.title}
                      </h3>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-4">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            area.compliance === 100
                              ? "bg-emerald-600"
                              : area.compliance >= 50
                              ? "bg-[#DD7230]"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${area.compliance}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 font-medium mb-4">
                        <span>Required: <strong>{area.required}</strong></span>
                        <span>Approved Evidence: <strong>{area.evidenceCount}</strong></span>
                        <span className="text-gray-600">Gaps: <strong className="text-gray-900">{area.gaps}</strong></span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewDetails ? handleViewDetails(area) : setExpandedArea(area)}
                      className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-2 border border-gray-200 cursor-pointer"
                    >
                      View Requirements & Evidence Details <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        /* Drawer View for Expanded AACCUP Area */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setExpandedArea(null)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors cursor-pointer"
                title="Back to All Areas"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <span className="text-xs font-bold text-[#DD7230] uppercase tracking-wider">{expandedArea.code}</span>
                <h2 className="text-xl font-bold text-gray-900">{expandedArea.title}</h2>
              </div>
            </div>
            <button
              onClick={() => {
                setUploadTargetArea(expandedArea);
                setUploadForm({ fileName: "", requirementTarget: "" });
                setShowUploadModal(true);
              }}
              className="px-4 py-2.5 bg-[#DD7230] hover:bg-[#DD7230] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <Upload className="h-4 w-4" /> Upload Evidence File
            </button>
          </div>

          {isLoadingDetails ? (
            <div className="py-16 text-center text-gray-500 flex justify-center items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[#DD7230]" />
              <span className="text-sm font-semibold">Loading area requirements & uploaded evidence...</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Required Documents Checklist</h3>
                  {userRole === "ADMIN" && (
                    <button
                      onClick={() => {
                        setNewAaccupReq({ area_code: expandedArea.code, area_title: expandedArea.title, description: "" });
                        setShowAddAaccupReqModal(true);
                      }}
                      className="px-3 py-1.5 bg-[#DD7230] hover:bg-[#DD7230] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Area Requirement
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {!areaDetails?.requirements || areaDetails.requirements.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs">
                      No requirements defined for this area yet.
                    </div>
                  ) : (
                    areaDetails.requirements.map((req: any, idx: number) => (
                      <div
                        key={req.id || idx}
                        className="p-3.5 rounded-xl border border-gray-200 bg-[#F9FAFB] flex items-center justify-between gap-3 text-xs group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CheckCircle2 className={`h-4 w-4 shrink-0 ${req.is_met || req.isUploaded ? "text-emerald-600" : "text-gray-300"}`} />
                          <span className="font-semibold text-gray-800 truncate">{req.text || req.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-md font-medium text-[10px] uppercase border ${
                              req.is_met || req.isUploaded 
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" 
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {req.is_met || req.isUploaded ? "Uploaded" : "Missing Evidence"}
                          </span>
                          {userRole === "ADMIN" && (
                            <div className="flex items-center gap-1 ml-1">
                              <button
                                onClick={() => {
                                  setEditingAaccupReq({
                                    id: req.id,
                                    area_code: expandedArea.code,
                                    area_title: expandedArea.title,
                                    description: req.text || req.title
                                  });
                                  setShowEditAaccupReqModal(true);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-700 transition-colors rounded cursor-pointer"
                                title="Edit Requirement"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setAaccupReqToDelete({
                                    id: req.id,
                                    description: req.text || req.title
                                  });
                                  setShowDeleteAaccupReqModal(true);
                                }}
                                className="p-1 text-gray-400 hover:text-rose-600 transition-colors rounded cursor-pointer"
                                title="Delete Requirement"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Uploaded Evidence Files ({selectedProgram})</h3>
                {areaDetails.uploadedFiles.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs">
                    No evidence files uploaded for this area yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {areaDetails.uploadedFiles.map((doc: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg shrink-0 mt-0.5">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate">{doc.name}</h4>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">Target: {doc.requirement_target}</p>
                            <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                              <span>Uploaded by: <strong className="text-gray-600">{doc.uploaded_by || 'Faculty'}</strong></span>
                              <span>•</span>
                              <span>Office: <strong className="text-gray-600">{doc.office || 'Academic'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase border ${
                              doc.status === "Approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                : doc.status === "Needs Revision"
                                ? "bg-rose-50 text-rose-700 border-rose-200/60"
                                : "bg-amber-50 text-amber-800 border-amber-200/60"
                            }`}
                          >
                            {doc.status || "Pending Verification"}
                          </span>

                          {(doc.url || doc.file_url) && (
                            <a
                              href={doc.url || doc.file_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => {
                                e.stopPropagation();
                                apiClient.post("/audit/access", {
                                  document_name: doc.name,
                                  action_type: "View",
                                  user_email: sessionStorage.getItem('userEmail'),
                                  user_role: userRole
                                }).catch(() => {});
                              }}
                              className="p-1.5 text-gray-500 hover:text-[#DD7230] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                              title="View Evidence File"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          )}

                          {userRole === "ADMIN" && (
                            <button
                              onClick={() => {
                                setDocToDelete(doc.name);
                                setShowDeleteModal(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Archive Evidence File"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export const ChedTabContent = ({
  chedRequirements,
  isLoadingChed,
  selectedProgram,
  userRole,
  userIsIqaAuditor,
  isUnassignedFaculty,
  setShowAddChedReqModal,
  setShowEditChedModal,
  setEditingChedReq,
  setChedReqToDelete,
  setShowDeleteChedReqModal,
  setSelectedChedReq,
  setShowChedUploadModal,
  setChedEvidenceToDelete,
  setShowDeleteChedEvidenceModal,
  handleReviewChedEvidence,
  isReviewing
}: any) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            CHED Program Compliance
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Monitoring of CMO requirements and mandatory submissions for {selectedProgram}.</p>
        </div>
        {userRole === "ADMIN" && (
          <button
            onClick={() => setShowAddChedReqModal(true)}
            className="px-3.5 py-2 bg-[#DD7230] hover:bg-[#DD7230] text-white font-medium text-xs rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Requirement
          </button>
        )}
      </div>

      <div className="p-5">
        {isLoadingChed ? (
          <div className="py-16 text-center text-gray-500 flex justify-center items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-[#DD7230]" />
            <span className="text-sm font-semibold">Loading CHED requirements...</span>
          </div>
        ) : chedRequirements.length === 0 ? (
          <div className="py-16 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            No CHED requirements configured for {selectedProgram} yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/80">
                  <th className="p-3.5 rounded-l-xl">CMO Title / Requirement</th>
                  <th className="p-3.5">Mandatory Evidences</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {chedRequirements.map((req: any) => (
                  <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-gray-900 max-w-xs">
                      <div>{req.cmo_name}</div>
                      {req.description && <div className="text-[11px] text-gray-500 font-normal mt-0.5">{req.description}</div>}
                    </td>
                    <td className="p-3.5">
                      {req.evidences && req.evidences.length > 0 ? (
                        <div className="space-y-1.5">
                          {req.evidences.map((ev: any, evIdx: number) => (
                            <div key={evIdx} className="flex items-center justify-between gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-3.5 w-3.5 text-[#DD7230] shrink-0" />
                                <span className="font-semibold text-gray-800 truncate max-w-[200px]">{ev.document_name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`px-2 py-0.5 text-[9px] font-medium rounded-md uppercase border ${
                                  ev.status === "Approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" :
                                  ev.status === "Needs Revision" ? "bg-rose-50 text-rose-700 border-rose-200/60" : "bg-amber-50 text-amber-800 border-amber-200/60"
                                }`}>
                                  {ev.status}
                                </span>
                                {(ev.file_url || ev.url) && (
                                  <a
                                    href={ev.file_url || ev.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded cursor-pointer"
                                    title="View Evidence Document"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </a>
                                )}
                                {(userRole === "ADMIN" || userIsIqaAuditor) && ev.status === "Pending Verification" && (
                                  <button
                                    onClick={() => handleReviewChedEvidence(ev.id, "Approved")}
                                    disabled={isReviewing}
                                    className="p-1 bg-gray-900 hover:bg-black text-white rounded cursor-pointer transition-colors shadow-2xs"
                                    title="Approve Evidence"
                                  >
                                    <Check className="h-3 w-3" />
                                  </button>
                                )}
                                {userRole === "ADMIN" && (
                                  <button
                                    onClick={() => { setChedEvidenceToDelete(ev); setShowDeleteChedEvidenceModal(true); }}
                                    className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                                    title="Remove Evidence"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No evidence uploaded yet</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md uppercase border ${
                        req.status === "Compliant" ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}>
                        {req.status || "Not Compliant"}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => { setSelectedChedReq(req); setShowChedUploadModal(true); }}
                        className="px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200 font-medium rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                      >
                        Upload Proof
                      </button>
                      {userRole === "ADMIN" && (
                        <>
                          <button
                            onClick={() => { setEditingChedReq(req); setShowEditChedModal(true); }}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setChedReqToDelete(req.id); setShowDeleteChedReqModal(true); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export const IsoTabContent = ({
  isoClauseRequirements,
  isLoadingIso,
  selectedProgram,
  userRole,
  userAdminOffice,
  isOfficeRestricted,
  isUnassignedFaculty,
  selectedIsoCycleYear,
  setSelectedIsoCycleYear,
  showIsoYearFilter,
  setShowIsoYearFilter,
  isoCycleOptions,
  expandedIsoClause,
  setExpandedIsoClause,
  isoClauseEvidences,
  isLoadingIsoEvidences,
  isoFilterCategory,
  setIsoFilterCategory,
  isoFilterOffice,
  setIsoFilterOffice,
  isoStatusFilter,
  setIsoStatusFilter,
  availableIsoOffices = [],
  isoSearchQuery,
  setIsoSearchQuery,
  filteredIsoClauses,
  isoCompliantCount,
  isoTotalCount,
  cycleTotalCount,
  cycleCompliantCount,
  isoCompliancePercent,
  iqaProgramSchedule,
  iqaAuditDays,
  qmsActionPlans,
  isLoadingQms,
  qmsFilterOffice,
  setQmsFilterOffice,
  qmsFilterType,
  setQmsFilterType,
  qmsFilterStatus,
  setQmsFilterStatus,
  qmsSearchQuery,
  setQmsSearchQuery,
  qmsStats,
  filteredQmsPlans,
  isoSubTab,
  setIsoSubTab,
  setShowAddIsoCycleModal,
  setShowAddIsoReqModal,
  setEditingIsoReq,
  setShowEditIsoReqModal,
  setIsoReqToDelete,
  setShowDeleteIsoReqModal,
  setSelectedIsoReqForUpload,
  setShowIsoUploadEvidenceModal,
  setIsoEvidenceToDelete,
  setShowDeleteIsoEvidenceModal,
  setShowEditIqaModal,
  setShowAddIqaDayModal,
  setEditingIqaDay,
  setShowEditIqaDayModal,
  setDeletingIqaDay,
  setShowDeleteIqaDayModal,
  setShowAddQmsModal,
  setEditingQmsPlan,
  setShowEditQmsModal,
  setQmsPlanToDelete,
  setShowDeleteQmsModal,
  setTargetQmsPlanForEvidence,
  setShowQmsEvidenceUploadModal,
  handleReviewIsoEvidence,
  handleUpdateQmsStatus,
  isReviewing,
  confirmIsoStatusUpdate,
  userIsIqaAuditor,
  showToast,
  setIsoFeedbackDoc,
  setIsoPendingStatus,
  setShowIsoFeedbackModal,
  setIsoFeedbackText,
  handleDeleteQmsEvidence
}: any) => {
  // Strict ISO Rule: Clause can only be approved if it has evidence, and ALL evidence is approved.
  const evidenceList = (expandedIsoClause?.evidences && expandedIsoClause.evidences.length > 0)
    ? expandedIsoClause.evidences
    : (isoClauseEvidences || []);
  const hasEvidence = (expandedIsoClause?.evidences && expandedIsoClause.evidences.length > 0) || (evidenceList.length > 0);
  const allEvidenceApproved = hasEvidence && evidenceList.every((ev: any) => ev.status === "Approved");
  const isClauseReadyForApproval = expandedIsoClause?.status !== "Compliant" && allEvidenceApproved;

  return (
    <>
      {!expandedIsoClause ? (
        <>
          {/* --- 100% ISO 9001:2015 COMPLIANCE SUCCESS BANNER --- */}
          {(cycleTotalCount ?? isoTotalCount) > 0 && (cycleCompliantCount ?? isoCompliantCount) === (cycleTotalCount ?? isoTotalCount) && (
            <div className="p-6 bg-[#006837] text-white rounded-2xl shadow-xl border-2 border-emerald-400 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/30 shadow-lg">
                    <Award className="h-10 w-10 text-amber-300 drop-shadow" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-amber-400 text-gray-900 text-[10px] font-bold uppercase rounded-md tracking-wider shadow-sm flex items-center gap-1">
                        <Award className="h-3 w-3 text-amber-900" /> 100% Fully Compliant
                      </span>
                      <span className="px-2.5 py-0.5 bg-white/20 text-white text-[10px] font-semibold rounded-md uppercase tracking-wider backdrop-blur-sm border border-white/30">
                        {selectedIsoCycleYear}
                      </span>
                      <span className="text-xs font-semibold text-emerald-100 hidden sm:inline">ISO 9001:2015 Audit Certified</span>
                    </div>
                    <h3 className="text-xl font-black mt-1 tracking-tight">
                      Institutional Quality Management System (QMS) Verified for {selectedIsoCycleYear}!
                    </h3>
                    <p className="text-xs text-emerald-100 mt-1 max-w-2xl leading-relaxed font-medium">
                      All {isoTotalCount} Internal Quality Audit (IQA) clauses for <span className="font-bold underline">{selectedIsoCycleYear}</span> have been successfully audited and approved. Historical audit records from previous cycles remain archived and preserved.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => showToast(`ISO Audit Report for ${selectedIsoCycleYear} generated!`, "success")}
                    className="px-5 py-3 bg-amber-400 text-gray-900 font-bold text-xs rounded-xl hover:bg-amber-300 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2 uppercase tracking-wider"
                  >
                    <Download className="h-4 w-4" /> Download Report ({selectedIsoCycleYear})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ISO 9001:2015 Summary Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 font-medium text-xs rounded-md flex items-center gap-1.5">
                    ISO 9001:2015 QMS
                  </span>
                  <div className="relative">
                    <button
                      onClick={() => setShowIsoYearFilter(!showIsoYearFilter)}
                      className="px-3 py-1 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Calendar className="h-3.5 w-3.5 text-gray-500" />
                      <span>{selectedIsoCycleYear}</span>
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    </button>
                    {showIsoYearFilter && (
                      <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-1 text-xs">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Audit Cycle Year</div>
                        {isoCycleOptions.map((yr: string) => (
                          <button
                            key={yr}
                            onClick={() => { setSelectedIsoCycleYear(yr); setShowIsoYearFilter(false); }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-gray-50 cursor-pointer ${yr === selectedIsoCycleYear ? "font-semibold text-gray-900 bg-gray-100/60" : "text-gray-700"}`}
                          >
                            <span>{yr}</span>
                            {yr === selectedIsoCycleYear && <Check className="h-3.5 w-3.5 text-gray-900" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {isOfficeRestricted && (
                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 font-medium text-xs rounded-md flex items-center gap-1">
                      <Lock className="h-3 w-3 text-gray-500" /> Scoped to: {userAdminOffice}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mt-2">Quality Management System & IQA Audit Schedule</h2>
                <p className="text-xs text-gray-500 mt-0.5">Unified campus-wide surveillance & internal audit monitoring for <strong>{selectedIsoCycleYear}</strong>.</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {userRole === "ADMIN" && (
                  <>
                    <button
                      onClick={() => setShowAddIsoCycleModal(true)}
                      className="px-3 py-2 bg-white hover:bg-orange-50/50 text-gray-700 hover:text-[#DD7230] rounded-lg text-xs font-medium transition-all border border-gray-300 hover:border-[#DD7230]/40 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> New Audit Cycle
                    </button>
                    <button
                      onClick={() => setShowAddIsoReqModal(true)}
                      className="px-3.5 py-2 bg-[#DD7230] hover:bg-[#DD7230] text-white font-medium text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Requirement
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sub-Tabs: ISO Clause Requirements vs QMS Action Plans */}
            <div className="px-5 pt-3 border-b border-gray-200 bg-gray-50/40 flex items-center gap-3">
              <button
                onClick={() => setIsoSubTab("clauses")}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isoSubTab === "clauses"
                    ? "border-[#DD7230] text-gray-900 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Clause Requirements ({isoCompliantCount}/{isoTotalCount})
              </button>
              <button
                onClick={() => setIsoSubTab("qms")}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  isoSubTab === "qms"
                    ? "border-[#DD7230] text-gray-900 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                QMS Action Plans ({qmsStats.total})
              </button>
            </div>

            {isoSubTab === "clauses" ? (
              /* --- CLAUSES TAB CONTENT --- */
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-2xs">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Clauses</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{isoTotalCount}</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-2xs">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Compliant</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <h3 className="text-2xl font-bold text-gray-900">{isoCompliantCount}</h3>
                      <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">Passed</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-2xs">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Clause Gaps</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <h3 className="text-2xl font-bold text-gray-900">{isoTotalCount - isoCompliantCount}</h3>
                      <span className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">Pending</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-2xs">
                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Overall Rate</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <h3 className="text-2xl font-bold text-gray-900">{isoCompliancePercent}%</h3>
                      <span className="text-[11px] text-gray-500">Audit</span>
                    </div>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                    <select
                      value={isoFilterCategory}
                      onChange={(e) => setIsoFilterCategory(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#DD7230] shadow-2xs cursor-pointer"
                    >
                      <option value="all">All Process Categories</option>
                      <option value="Core Process">Core Process</option>
                      <option value="Support Process">Support Process</option>
                      <option value="Management Process">Management Process</option>
                    </select>

                    <select
                      value={isoFilterOffice}
                      onChange={(e) => setIsoFilterOffice(e.target.value)}
                      disabled={isOfficeRestricted}
                      className={`px-3 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#DD7230] shadow-2xs cursor-pointer ${
                        isOfficeRestricted ? "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed" : "bg-white text-gray-700 border-gray-200"
                      }`}
                    >
                      <option value="all">All Auditee Offices ({availableIsoOffices.length > 0 ? availableIsoOffices.length : 16} Offices)</option>
                      {(availableIsoOffices.length > 0 ? availableIsoOffices : ISO_OFFICES_16).map((off: string) => (
                        <option key={off} value={off}>{off}</option>
                      ))}
                    </select>

                    <select
                      value={isoStatusFilter}
                      onChange={(e) => setIsoStatusFilter && setIsoStatusFilter(e.target.value)}
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#DD7230] shadow-2xs cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Compliant">Compliant</option>
                      <option value="Pending">Pending</option>
                      <option value="Not Compliant">Not Compliant</option>
                    </select>

                    {(isoFilterCategory !== "all" || (isoFilterOffice !== "all" && !isOfficeRestricted) || (isoStatusFilter && isoStatusFilter !== "all") || isoSearchQuery) && (
                      <button
                        onClick={() => {
                          setIsoFilterCategory("all");
                          if (!isOfficeRestricted) setIsoFilterOffice("all");
                          if (setIsoStatusFilter) setIsoStatusFilter("all");
                          setIsoSearchQuery("");
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                        title="Reset all ISO clause filters"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                    <input
                      type="text"
                      placeholder="Search clauses, titles, offices..."
                      value={isoSearchQuery}
                      onChange={(e) => setIsoSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230] shadow-2xs"
                    />
                  </div>
                </div>

                {/* ISO Clause Table */}
                {isLoadingIso ? (
                  <div className="py-16 text-center text-gray-500 flex justify-center items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-[#DD7230]" />
                    <span className="text-sm font-semibold">Loading ISO clause requirements...</span>
                  </div>
                ) : filteredIsoClauses.length === 0 ? (
                  <div className="py-16 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs font-medium">
                    No ISO clause requirements match your current filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/80">
                          <th className="p-3.5 rounded-l-xl">Clause & Title</th>
                          <th className="p-3.5">Auditee Office</th>
                          <th className="p-3.5">Evidences</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right rounded-r-xl">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-xs">
                        {filteredIsoClauses.map((clause: any) => (
                          <tr 
                            key={clause.id} 
                            onClick={() => setExpandedIsoClause(clause)}
                            className="hover:bg-orange-50/50 transition-colors cursor-pointer group"
                            title="Click to open clause details and evidence"
                          >
                            <td className="p-3.5 font-bold text-gray-900 max-w-xs">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 text-[10px] font-semibold rounded-md shrink-0 transition-colors">
                                  {clause.iso_clause}
                                </span>
                                <span className="truncate group-hover:text-gray-950 transition-colors">{clause.title}</span>
                              </div>
                              {clause.process_category && (
                                <span className="text-[10px] text-gray-400 font-medium block mt-0.5">{clause.process_category}</span>
                              )}
                            </td>
                            <td className="p-3.5 text-gray-600 font-medium">{clause.auditee_office || 'Campus-Wide'}</td>
                            <td className="p-3.5 font-semibold text-gray-700">{clause.evidences?.length || 0} file(s)</td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md uppercase border ${
                                clause.status === "Compliant" ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}>
                                {clause.status || "Not Compliant"}
                              </span>
                            </td>
                            <td className="p-3.5 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                              {!isUnassignedFaculty && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedIsoReqForUpload(clause); setShowIsoUploadEvidenceModal(true); }}
                                  className="px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200 font-medium rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                                >
                                  Upload Proof
                                </button>
                              )}
                              {userRole === "ADMIN" && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingIsoReq(clause); setShowEditIsoReqModal(true); }}
                                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg cursor-pointer"
                                    title="Edit Clause"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setIsoReqToDelete(clause); setShowDeleteIsoReqModal(true); }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                    title="Delete Clause"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3-Day IQA Schedule Table */}
                <div className="pt-6 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#DD7230]" /> Internal Quality Audit Schedule (IQA Form 1 & 2) ({selectedIsoCycleYear})
                      </h3>
                      <p className="text-xs text-gray-500">Annual audit cycle schedule for CTU Argao Campus offices.</p>
                    </div>
                    {userRole === "ADMIN" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowAddIqaDayModal(true)}
                          className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-[#DD7230] border border-[#DD7230]/30 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Audit Day
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {iqaAuditDays.map((day: any) => (
                      <div key={day.id || day.day_number} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 relative group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="px-2.5 py-1 bg-[#DD7230] text-white font-bold text-[10px] rounded-md uppercase tracking-wider">
                            Day {day.day_number}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">{day.day_date}</span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm mb-1">{day.title}</h4>
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{day.scope}</p>
                        {userRole === "ADMIN" && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 backdrop-blur-xs p-1 rounded-lg border border-gray-200 shadow-2xs">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingIqaDay(day); setShowEditIqaDayModal(true); }}
                              className="p-1 text-gray-500 hover:text-gray-800 rounded cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeletingIqaDay(day); setShowDeleteIqaDayModal(true); }}
                              className="p-1 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* --- QMS ACTION PLANS TAB CONTENT --- */
              <div className="p-6 space-y-6">
                {isUnassignedFaculty ? (
                  <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
                    <ShieldAlert className="h-10 w-10 text-red-600 mx-auto" />
                    <h3 className="text-base font-bold text-red-900">Restricted Access — Unassigned Faculty Account</h3>
                    <p className="text-xs text-red-700 max-w-md mx-auto leading-relaxed">
                      Your faculty account does not have an assigned Administrative/Auditee Office. QMS Action Plans are scoped strictly to verified Auditee Offices. Please contact the Administrator to update your office assignment.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                          <FileCheck className="h-5 w-5 text-[#DD7230]" /> Corrective Action Logsheet (CAR Form 3)
                        </h3>
                        <p className="text-xs text-gray-500">Corrective actions, opportunities for improvement, and risk registers across campus offices.</p>
                      </div>
                      {userRole === "ADMIN" && (
                        <button
                          onClick={() => setShowAddQmsModal(true)}
                          className="px-4 py-2.5 bg-[#DD7230] hover:bg-[#DD7230] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
                        >
                          <Plus className="w-4 h-4" /> New Action Plan (Form 6)
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="text-2xl font-extrabold text-gray-900">{qmsStats.total}</div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Total Action Plans</div>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <div className="text-2xl font-extrabold text-amber-700">{qmsStats.inProgress}</div>
                        <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">In Progress</div>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                        <div className="text-2xl font-extrabold text-emerald-700">{qmsStats.completed}</div>
                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Completed</div>
                      </div>
                      <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                        <div className="text-2xl font-extrabold text-red-600">{qmsStats.overdue}</div>
                        <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mt-0.5">Overdue Plans</div>
                      </div>
                    </div>

                    {/* QMS Filters */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                        <select
                          value={qmsFilterOffice}
                          onChange={(e) => setQmsFilterOffice(e.target.value)}
                          disabled={isOfficeRestricted}
                          className={`px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#DD7230] ${
                            isOfficeRestricted ? "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed" : "bg-[#F5F7FA] text-gray-700 border-gray-200"
                          }`}
                        >
                          <option value="all">All ISO Offices (16 Offices)</option>
                          {ISO_OFFICES_16.map((off: string) => (
                            <option key={off} value={off}>{off}</option>
                          ))}
                        </select>

                        <select
                          value={qmsFilterType}
                          onChange={(e) => setQmsFilterType(e.target.value)}
                          className="px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                        >
                          <option value="all">All Types (Process/People/Paper)</option>
                          <option value="Process">Process</option>
                          <option value="People">People</option>
                          <option value="Paper">Paper</option>
                          <option value="Risk/Opportunity">Risk / Opportunity</option>
                        </select>

                        <select
                          value={qmsFilterStatus}
                          onChange={(e) => setQmsFilterStatus(e.target.value)}
                          className="px-3 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                        >
                          <option value="all">All Statuses</option>
                          <option value="Proposed">Proposed</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </div>

                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                        <input
                          type="text"
                          placeholder="Search action plans..."
                          value={qmsSearchQuery}
                          onChange={(e) => setQmsSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                        />
                      </div>
                    </div>

                    {/* QMS Table */}
                    {isLoadingQms ? (
                      <div className="py-16 text-center text-gray-500 flex justify-center items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-[#DD7230]" />
                        <span className="text-sm font-semibold">Loading QMS Action Plans...</span>
                      </div>
                    ) : filteredQmsPlans.length === 0 ? (
                      <div className="py-16 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs font-medium">
                        No QMS Action Plans match your current filters.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-2xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/80">
                              <th className="p-3.5 rounded-l-xl">Auditee Office</th>
                              <th className="p-3.5">Opportunity / Finding</th>
                              <th className="p-3.5">Action Plan</th>
                              <th className="p-3.5">Proofs / Evidences</th>
                              <th className="p-3.5">Target Date</th>
                              <th className="p-3.5">Status</th>
                              <th className="p-3.5 text-right rounded-r-xl">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-xs">
                            {filteredQmsPlans.map((plan: any) => (
                              <tr key={plan.id} className="hover:bg-gray-50/60 transition-colors">
                                <td className="p-3.5 font-bold text-gray-900 max-w-xs">
                                  <div>{plan.auditee_office}</div>
                                  <span className="text-[10px] text-gray-400 font-normal block mt-0.5">{plan.finding_type || 'Opportunity'}</span>
                                </td>
                                <td className="p-3.5 text-gray-700 max-w-xs truncate">{plan.opportunity_description}</td>
                                <td className="p-3.5 text-gray-700 max-w-xs truncate">{plan.action_plan}</td>
                                <td className="p-3.5 text-gray-700 max-w-xs align-top">
                                  {plan.evidences && plan.evidences.length > 0 ? (
                                    <div className="flex flex-col gap-1.5">
                                      {plan.evidences.map((ev: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-1 group">
                                          <a 
                                            href={ev.file_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-[10px] bg-orange-50 text-[#DD7230] px-2 py-1 rounded border border-orange-200/50 hover:bg-orange-100 flex-1 min-w-0 cursor-pointer transition-colors"
                                            title={ev.document_name}
                                          >
                                            <FileText className="h-3 w-3 shrink-0" />
                                            <span className="truncate font-medium">{ev.document_name}</span>
                                          </a>
                                          {(userRole === "ADMIN" || userIsIqaAuditor || plan.auditee_office === userAdminOffice) && (
                                            <button 
                                              type="button"
                                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteQmsEvidence(ev); }}
                                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded bg-white border border-gray-100 transition-all cursor-pointer shadow-sm"
                                              title="Delete Evidence"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 italic">No proofs attached</span>
                                  )}
                                </td>
                                <td className="p-3.5 text-gray-600 font-semibold">{plan.target_completion_date || 'N/A'}</td>
                                <td className="p-3.5">
                                  <select
                                    value={plan.status}
                                    onChange={(e) => {
                                      if (e.target.value === "Completed" && !(userRole === "ADMIN" || userIsIqaAuditor)) {
                                        showToast("Only Admins and IQA Auditors can officially verify and close out Action Plans.", "warning");
                                        return;
                                      }
                                      handleUpdateQmsStatus(plan.id, e.target.value);
                                    }}
                                    className={`px-2.5 py-1 text-[11px] font-medium rounded-md border focus:outline-none cursor-pointer transition-colors ${
                                      plan.status === "Completed" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                                      plan.status === "In Progress" ? "bg-amber-50 text-amber-800 border-amber-200" :
                                      plan.status === "Overdue" ? "bg-rose-50 text-rose-800 border-rose-200" :
                                      "bg-gray-50 text-gray-700 border-gray-200"
                                    }`}
                                  >
                                    <option value="Proposed">Proposed</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Overdue">Overdue</option>
                                  </select>
                                </td>
                                <td className="p-3.5 text-right space-x-1">
                                  <button
                                    onClick={() => { setTargetQmsPlanForEvidence(plan); setShowQmsEvidenceUploadModal(true); }}
                                    className="px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200 font-medium rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                                  >
                                    Attach Proof
                                  </button>
                                  {userRole === "ADMIN" && (
                                    <>
                                      <button
                                        onClick={() => { setEditingQmsPlan(plan); setShowEditQmsModal(true); }}
                                        className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg cursor-pointer"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={() => { setQmsPlanToDelete(plan); setShowDeleteQmsModal(true); }}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* Drawer View for ISO Clause Details */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setExpandedIsoClause(null)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#DD7230] uppercase tracking-wider">{expandedIsoClause.iso_clause}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md uppercase border ${
                    expandedIsoClause.status === "Compliant" 
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200/60" 
                      : expandedIsoClause.status === "Pending"
                      ? "bg-amber-50 text-amber-800 border-amber-200/60"
                      : "bg-rose-50 text-rose-800 border-rose-200/60"
                  }`}>
                    {expandedIsoClause.status || "Not Compliant"}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-600 font-medium">{expandedIsoClause.auditee_office || "Campus-Wide"}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5">{expandedIsoClause.title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Quick Compliance Action Buttons for Admin & IQA Auditors */}
              {(userRole === "ADMIN" || userIsIqaAuditor || userAdminOffice === "Quality Assurance") && (
                <>
                  <button
                    onClick={() => confirmIsoStatusUpdate && confirmIsoStatusUpdate(expandedIsoClause.id, "Compliant", `${expandedIsoClause.iso_clause}: ${expandedIsoClause.title}`)}
                    disabled={!isClauseReadyForApproval}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 ${
                      isClauseReadyForApproval 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95" 
                        : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                    }`}
                    title={isClauseReadyForApproval ? "Approve ISO clause as fully compliant" : "Cannot approve: All evidence files must be verified and approved first."}
                  >
                    <Check className="h-4 w-4" /> Approve Clause
                  </button>
                  
                  {expandedIsoClause.status !== "Not Compliant" && (
                    <button
                      onClick={() => confirmIsoStatusUpdate && confirmIsoStatusUpdate(expandedIsoClause.id, "Not Compliant", `${expandedIsoClause.iso_clause}: ${expandedIsoClause.title}`)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title="Mark clause non-compliant and trigger Corrective Action Plan (CAR)"
                    >
                      <AlertTriangle className="h-4 w-4 text-rose-600" /> Decline / CAR
                    </button>
                  )}
                </>
              )}

              {!isUnassignedFaculty && (
                <button
                  onClick={() => { setSelectedIsoReqForUpload(expandedIsoClause); setShowIsoUploadEvidenceModal(true); }}
                  className="px-3.5 py-2 bg-[#DD7230] hover:bg-[#c45e22] text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                >
                  <Upload className="h-4 w-4" /> Upload Proof
                </button>
              )}
            </div>
          </div>

          {isLoadingIsoEvidences ? (
            <div className="py-16 text-center text-gray-500 flex justify-center items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[#DD7230]" />
              <span className="text-sm font-semibold">Loading clause evidence details...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Uploaded Evidence Files ({selectedProgram})</h3>
              {isoClauseEvidences.length === 0 ? (
                <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs">
                  No evidence files attached to this clause yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {isoClauseEvidences.map((doc: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-gray-200 bg-white flex flex-col gap-2.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-gray-900 truncate">{doc.document_name}</h4>
                            <span className="text-[10px] text-gray-400">{doc.office || 'Campus-Wide'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase border ${
                            doc.status === "Approved" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60" 
                              : doc.status === "Needs Revision"
                              ? "bg-rose-50 text-rose-700 border-rose-200/60"
                              : "bg-amber-50 text-amber-800 border-amber-200/60"
                          }`}>
                            {doc.status || "Pending Verification"}
                          </span>
                          
                          <div className="flex items-center gap-1 ml-2 border-l border-gray-200 pl-2">
                            {(doc.file_url || doc.url) && (
                              <a
                                href={doc.file_url || doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                                title="View Evidence Document"
                              >
                                <Eye className="h-4 w-4" />
                              </a>
                            )}
                            {(userRole === "ADMIN" || userIsIqaAuditor || userAdminOffice === "Quality Assurance") && (
                              <>
                                {doc.status !== "Approved" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsoFeedbackDoc(doc);
                                      setIsoPendingStatus("Approved");
                                      setIsoFeedbackText(doc.admin_feedback || "");
                                      setShowIsoFeedbackModal(true);
                                    }}
                                    disabled={isReviewing}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                    title="Approve Evidence"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                )}
                                {doc.status !== "Needs Revision" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsoFeedbackDoc(doc);
                                      setIsoPendingStatus("Needs Revision");
                                      setIsoFeedbackText(doc.admin_feedback || "");
                                      setShowIsoFeedbackModal(true);
                                    }}
                                    disabled={isReviewing}
                                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                                    title="Decline Evidence / Request Revision"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                )}
                              </>
                            )}
                            {userRole === "ADMIN" && (
                              <button
                                onClick={() => { setIsoEvidenceToDelete(doc); setShowDeleteIsoEvidenceModal(true); }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                title="Delete Evidence"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {doc.admin_feedback && (
                        <div className="mt-0.5 px-3 py-2 bg-amber-50/70 border border-amber-200/60 rounded-lg text-xs flex items-start gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-amber-900 text-[11px] block">Auditor Verification Remarks:</span>
                            <p className="text-gray-700 text-xs mt-0.5 leading-relaxed break-words">{doc.admin_feedback}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export const ResultsTabContent = ({
  currentData,
  selectedProgram,
  userRole,
  programAccreditation,
  setShowEditStandingModal,
  setEditStandingForm,
  setShowUpgradeModal,
  setUpgradeForm,
  accreditationLogs,
  showToast,
  setTargetHistoryId,
  setShowCertModal,
  handleViewDocument
}: any) => {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Column: Timeline & History */}
      <div className="w-full lg:w-2/3 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 p-5 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Accreditation Timeline & Promotion History
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Historical promotion levels, survey evaluations, and attached certificates for {selectedProgram}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {userRole === "ADMIN" && (
                <>
                  <button
                    onClick={() => {
                      setEditStandingForm({
                        new_level: programAccreditation?.current_level || "Candidate Status",
                        valid_until_date: programAccreditation?.valid_until ? programAccreditation.valid_until.split("T")[0] : ""
                      });
                      setShowEditStandingModal(true);
                    }}
                    className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold transition-all border border-gray-300 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Calibrate Level
                  </button>
                  <button
                    onClick={() => {
                      setUpgradeForm({
                        new_level: "Level I Accredited",
                        valid_until_date: "",
                        certificate_url: "",
                        remarks: ""
                      });
                      setShowUpgradeModal(true);
                    }}
                    className="px-3 py-1.5 bg-[#DD7230] hover:bg-[#c66224] text-white rounded-lg text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" /> Log Promotion
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="p-5">
            {accreditationLogs.length === 0 ? (
              <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-xs">
                No historical accreditation logs found for {selectedProgram}.
              </div>
            ) : (
              <div className="relative border-l-2 border-[#DD7230]/30 pl-5 space-y-4 my-2 ml-2">
                {accreditationLogs.map((log: any, idx: number) => {
                  const levelName = log.level_achieved || log.accreditation_level || "Accredited Status";
                  const dateGranted = log.date_granted ? log.date_granted.split("T")[0] : (log.created_at ? log.created_at.split("T")[0] : "N/A");
                  const validUntil = log.valid_until ? log.valid_until.split("T")[0] : null;

                  return (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[27px] top-2 w-3.5 h-3.5 rounded-full bg-[#DD7230] border-2 border-white shadow-2xs ring-2 ring-[#DD7230]/20"></div>
                      <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-200 hover:border-[#DD7230]/40 transition-all shadow-2xs space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 border border-gray-200 font-semibold text-xs rounded-md">
                              {levelName}
                            </span>
                            {validUntil && (
                              <span className="text-[11px] text-gray-500 font-medium">
                                Valid until: <strong className="text-gray-700">{validUntil}</strong>
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 font-medium">Granted: {dateGranted}</span>
                        </div>

                        <p className="text-xs text-gray-700 font-medium leading-relaxed">
                          {log.remarks || `Program ${selectedProgram} granted official standing: ${levelName}`}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-200/60">
                          {log.certificate_url ? (
                            <button
                              type="button"
                              onClick={() => handleViewDocument ? handleViewDocument(log.certificate_url, `${selectedProgram}_Certificate.pdf`) : window.open(log.certificate_url, "_blank")}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DD7230] hover:text-[#c66224] hover:underline cursor-pointer"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                              View Official Certificate & Evidence <ExternalLink className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">No certificate or evidence file attached yet.</span>
                          )}

                          {userRole === "ADMIN" && (
                            <button
                              type="button"
                              onClick={() => {
                                setTargetHistoryId(log.id);
                                setShowCertModal(true);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 text-[11px] font-semibold rounded-lg border border-gray-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <Upload className="w-3 h-3 text-[#DD7230]" />
                              {log.certificate_url ? "Replace Evidence/Certificate" : "Upload Evidence / Certificate"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Institutional Scorecard */}
      <div className="w-full lg:w-1/3 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-[#DD7230]" /> Institutional Scorecard
            </h3>
            <button
              onClick={() => showToast(`Institutional QA Scorecard Report generated!`, "success")}
              className="p-2 text-gray-500 hover:text-[#DD7230] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
              title="Download Scorecard"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-600">Current Program</span>
              <strong className="text-gray-900">{selectedProgram}</strong>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-600">AACCUP Standing</span>
              <strong className="text-[#DD7230] font-bold">{programAccreditation?.current_level || currentData.level || "Candidate Status"}</strong>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-600">Validity Period</span>
              <strong className="text-gray-900">{programAccreditation?.valid_until ? programAccreditation.valid_until.split("T")[0] : 'N/A'}</strong>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Area Compliance Rate</h4>
            <div className="space-y-2">
              {currentData.areas?.map((a: any) => {
                const rate = a.compliance || 0;
                return (
                  <div key={a.code} className="text-xs">
                    <div className="flex justify-between font-semibold text-gray-700 mb-1">
                      <span>{a.code}: {a.title}</span>
                      <span>{rate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${rate === 100 ? "bg-[#006837]" : rate >= 50 ? "bg-[#DD7230]" : "bg-red-500"}`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReusableConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  title,
  description,
  confirmText,
  confirmColorClass = "bg-red-600 hover:bg-red-700",
  icon: Icon = ShieldAlert
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  confirmColorClass?: string;
  icon?: any;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
        <div className="p-6 border-b border-red-50 bg-red-50 flex items-center gap-3">
          <Icon className="h-6 w-6 text-red-600" />
          <h2 className="text-xl font-bold text-red-700">{title}</h2>
        </div>
        <div className="p-6 space-y-4">
          {typeof description === "string" ? (
            <p className="text-sm text-gray-600 leading-relaxed font-medium">{description}</p>
          ) : (
            description
          )}
        </div>
        <div className="p-6 border-t border-gray-100 bg-[#F9FAFB] flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer uppercase tracking-widest disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer uppercase tracking-widest shadow-md ${confirmColorClass}`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
              </>
            ) : (
              confirmText || "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ReusableUploadModal = ({
  isOpen,
  onClose,
  onSubmit,
  file,
  setFile,
  fileName,
  setFileName,
  isUploading,
  title,
  subtitle,
  targetName
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  fileName: string;
  setFileName: (s: string) => void;
  isUploading?: boolean;
  title: string;
  subtitle?: string;
  targetName?: string;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 text-[#DD7230] rounded-xl">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              {subtitle && <p className="text-xs text-[#DD7230] font-semibold mt-0.5 uppercase tracking-wider">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {targetName && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700">
              Target: <span className="font-bold text-gray-900">{targetName}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Document Name / Title
            </label>
            <input
              type="text"
              required
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. Approved Curriculum Map 2026"
              className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Select File (PDF / DOCX)
            </label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx"
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-[#DD7230] hover:file:bg-orange-100 cursor-pointer"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !file || !fileName.trim()}
              className="px-5 py-2.5 text-xs font-bold bg-[#DD7230] text-white rounded-xl hover:bg-[#DD7230] transition-colors uppercase tracking-widest disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                </>
              ) : (
                "Upload Document"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export function AccreditationSupport() {
  const userRole = sessionStorage.getItem('userRole') || 'STUDENT';
  const userDept = sessionStorage.getItem('userDepartment') || 'BSIT';
  const userName = sessionStorage.getItem('userName') || 'Faculty User';
  const userAdminOffice = sessionStorage.getItem('userAdministrativeOffice') || '';
  const userIsIqaAuditor = sessionStorage.getItem('isIqaAuditor') === 'true';
  const isQualityAssuranceOrAuditor = userRole === 'ADMIN' || userIsIqaAuditor || userAdminOffice === 'Quality Assurance';
  const isOfficeRestricted = !isQualityAssuranceOrAuditor && Boolean(userAdminOffice && ISO_OFFICES_16.includes(userAdminOffice));
  const isUnassignedFaculty = !isQualityAssuranceOrAuditor && (!userAdminOffice || !ISO_OFFICES_16.includes(userAdminOffice));

  const [selectedProgram, setSelectedProgram] = useState(userRole === 'FACULTY' ? userDept : "BSIT");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
    const duration = type === 'error' ? 5000 : type === 'warning' ? 4000 : 3000;
    setTimeout(() => setToast(null), duration);
  };



  // AACCUP Area Configuration State (Level III/IV Scoped Evaluations)
  const [showAreaConfigModal, setShowAreaConfigModal] = useState(false);
  const [activeAreas, setActiveAreas] = useState<string[]>([
    "Area I", "Area II", "Area III", "Area IV", "Area V", "Area VI", "Area VII", "Area VIII", "Area IX", "Area X"
  ]);
  const [isSavingAreaConfig, setIsSavingAreaConfig] = useState(false);

  const [activeTab, setActiveTab] = useState("aaccup");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTargetArea, setUploadTargetArea] = useState<any>(null);
  const [uploadForm, setUploadForm] = useState({ fileName: "", requirementTarget: "" });
  const [isUploading, setIsUploading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedArea, setExpandedArea] = useState<any>(null);
  const [areaDetails, setAreaDetails] = useState({ requirements: [], uploadedFiles: [] });
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [isAdminQueueOpen, setIsAdminQueueOpen] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<any[]>([]); // Handles AACCUP
  const [pendingIsoDocs, setPendingIsoDocs] = useState<any[]>([]); // Handles ISO
  const [isReviewing, setIsReviewing] = useState(false);
  
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackDoc, setFeedbackDoc] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState("");

  const [currentData, setCurrentData] = useState<any>({
    level: "Loading...", overall: 0, gaps: 0, evidence: 0, areas: []
  });

  // --- AACCUP REQUIREMENTS CRUD STATES ---
  const [showAddAaccupReqModal, setShowAddAaccupReqModal] = useState(false);
  const [newAaccupReq, setNewAaccupReq] = useState({ area_code: "Area I", area_title: "Vision, Mission, Goals and Objectives", description: "" });
  const [isAddingAaccupReq, setIsAddingAaccupReq] = useState(false);
  const [showEditAaccupReqModal, setShowEditAaccupReqModal] = useState(false);
  const [editingAaccupReq, setEditingAaccupReq] = useState<any>(null);
  const [isEditingAaccupReq, setIsEditingAaccupReq] = useState(false);
  const [showDeleteAaccupReqModal, setShowDeleteAaccupReqModal] = useState(false);
  const [aaccupReqToDelete, setAaccupReqToDelete] = useState<any>(null);

  const [chedRequirements, setChedRequirements] = useState<any[]>([]);
  const [isLoadingChed, setIsLoadingChed] = useState(false);
  const [showChedUploadModal, setShowChedUploadModal] = useState(false);
  const [selectedChedReq, setSelectedChedReq] = useState<any>(null);
  
  // Admin specific CHED states
  const [showAddChedReqModal, setShowAddChedReqModal] = useState(false);
  const [newChedReq, setNewChedReq] = useState({ cmo_name: "", description: "" });
  const [isAddingReq, setIsAddingReq] = useState(false);
  
  // Edit CHED states
  const [showEditChedModal, setShowEditChedModal] = useState(false);
  const [editingChedReq, setEditingChedReq] = useState<any>(null);
  const [isEditingReq, setIsEditingReq] = useState(false);

  // Custom Delete Modals for CHED
  const [showDeleteChedReqModal, setShowDeleteChedReqModal] = useState(false);
  const [chedReqToDelete, setChedReqToDelete] = useState<string | null>(null);
  const [showDeleteChedEvidenceModal, setShowDeleteChedEvidenceModal] = useState(false);
  const [chedEvidenceToDelete, setChedEvidenceToDelete] = useState<any>(null);

  // --- ISO 9001:2015 QMS STATES ---
  const [isoRequirements, setIsoRequirements] = useState<any[]>(() => {
    return isoRequirementsCache.get("2026 Recertification") || [];
  });
  const [isLoadingIso, setIsLoadingIso] = useState(() => {
    return !isoRequirementsCache.has("2026 Recertification");
  });
  const [showIsoUploadModal, setShowIsoUploadModal] = useState(false);
  const [selectedIsoReq, setSelectedIsoReq] = useState<any>(null);
  const [isoOfficeFilter, setIsoOfficeFilter] = useState("all");
  const [isoFilterCategory, setIsoFilterCategory] = useState("all");
  const [isoStatusFilter, setIsoStatusFilter] = useState("all");
  const [isoSearchQuery, setIsoSearchQuery] = useState("");

  const availableIsoOffices = useMemo(() => {
    return Array.from(
      new Set(isoRequirements.map((r: any) => r.auditee_office).filter(Boolean))
    ).sort();
  }, [isoRequirements]);

  // ISO Audit Cycle Year & Expanded Clause States
  const [selectedIsoCycleYear, setSelectedIsoCycleYear] = useState("2026 Recertification");
  const [showIsoYearFilter, setShowIsoYearFilter] = useState(false);
  const [isoCycleOptions, setIsoCycleOptions] = useState<string[]>(() => {
    return isoCyclesCache || ["2026 Recertification", "2025 Surveillance", "2024 Initial Audit"];
  });
  const [showAddIsoCycleModal, setShowAddIsoCycleModal] = useState(false);
  const [newIsoCycleName, setNewIsoCycleName] = useState("");
  const [isCreatingCycle, setIsCreatingCycle] = useState(false);
  const [expandedIsoClause, setExpandedIsoClause] = useState<any>(null);

  // Add ISO Requirement States
  const [showAddIsoReqModal, setShowAddIsoReqModal] = useState(false);
  const [newIsoReq, setNewIsoReq] = useState({
    iso_clause: "",
    title: "",
    description: "",
    auditee_office: ISO_OFFICES_16[0],
    risk_level: "Medium"
  });
  const [isAddingIsoReq, setIsAddingIsoReq] = useState(false);

  // Edit & Delete ISO Requirement States
  const [showEditIsoModal, setShowEditIsoModal] = useState(false);
  const [editingIsoReq, setEditingIsoReq] = useState<any>(null);
  const [isEditingIsoReq, setIsEditingIsoReq] = useState(false);
  const [showDeleteIsoReqModal, setShowDeleteIsoReqModal] = useState(false);
  const [isoReqToDelete, setIsoReqToDelete] = useState<any>(null);

  // ISO evidence delete confirm
  const [showDeleteIsoEvidenceModal, setShowDeleteIsoEvidenceModal] = useState(false);
  const [isoEvidenceToDelete, setIsoEvidenceToDelete] = useState<any>(null);

  // ISO evidence verification & feedback modal
  const [showIsoFeedbackModal, setShowIsoFeedbackModal] = useState(false);
  const [isoFeedbackDoc, setIsoFeedbackDoc] = useState<any>(null);
  const [isoFeedbackText, setIsoFeedbackText] = useState("");
  const [isoPendingStatus, setIsoPendingStatus] = useState("");

  // ISO status change confirm
  const [showIsoStatusModal, setShowIsoStatusModal] = useState(false);
  const [pendingIsoStatus, setPendingIsoStatus] = useState<{ reqId: string; status: string; title: string } | null>(null);

  // --- QMS ACTION PLAN STATES (MRC Form 6) ---
  const [isoSubTab, setIsoSubTab] = useState<"clauses" | "qms">("clauses");
  const [qmsActionPlans, setQmsActionPlans] = useState<any[]>(() => {
    return qmsPlansCache.get("2026 Recertification") || [];
  });
  const [isLoadingQmsPlans, setIsLoadingQmsPlans] = useState(false);
  const [qmsOfficeFilter, setQmsOfficeFilter] = useState("all");
  const [qmsTypeFilter, setQmsTypeFilter] = useState("all");
  const [qmsStatusFilter, setQmsStatusFilter] = useState("all");
  const [qmsSearchQuery, setQmsSearchQuery] = useState("");

  const [showAddQmsModal, setShowAddQmsModal] = useState(false);
  const [isAddingQms, setIsAddingQms] = useState(false);
  const [isExtractingCar, setIsExtractingCar] = useState(false);
  const [newQmsPlan, setNewQmsPlan] = useState({
    auditee_office: "HRMO",
    process_area: "",
    opportunity_type: "Process",
    opportunity_description: "",
    action_plan: "",
    target_date: "",
    personnel_responsible: "",
    status: "In Progress"
  });

  const [showEditQmsModal, setShowEditQmsModal] = useState(false);
  const [editingQmsPlan, setEditingQmsPlan] = useState<any>(null);
  const [isEditingQms, setIsEditingQms] = useState(false);

  const [showDeleteQmsModal, setShowDeleteQmsModal] = useState(false);
  const [qmsPlanToDelete, setQmsPlanToDelete] = useState<any>(null);
  const [isDeletingQms, setIsDeletingQms] = useState(false);

  // QMS Evidence Delete state
  const [showDeleteQmsEvidenceModal, setShowDeleteQmsEvidenceModal] = useState(false);
  const [qmsEvidenceToDelete, setQmsEvidenceToDelete] = useState<any>(null);
  const [isDeletingQmsEvidence, setIsDeletingQmsEvidence] = useState(false);

  // QMS Evidence Upload state
  const [showQmsEvidenceUploadModal, setShowQmsEvidenceUploadModal] = useState(false);
  const [targetQmsPlanForEvidence, setTargetQmsPlanForEvidence] = useState<any>(null);
  const [qmsEvidenceDocName, setQmsEvidenceDocName] = useState("");
  const [qmsEvidenceFile, setQmsEvidenceFile] = useState<File | null>(null);
  const [isUploadingQmsEvidence, setIsUploadingQmsEvidence] = useState(false);

  // QMS Closeout Assessment state
  const [showQmsCloseoutModal, setShowQmsCloseoutModal] = useState(false);
  const [targetQmsPlanForCloseout, setTargetQmsPlanForCloseout] = useState<any>(null);
  const [closeoutForm, setCloseoutForm] = useState({
    actual_completion_date: "",
    assessment_date: "",
    assessment_notes: ""
  });
  const [isSavingCloseout, setIsSavingCloseout] = useState(false);

  // AACCUP approve confirm
  const [showAaccupApproveModal, setShowAaccupApproveModal] = useState(false);
  const [pendingAaccupApprove, setPendingAaccupApprove] = useState<any>(null);

  // CHED admin review confirm
  const [showChedReviewModal, setShowChedReviewModal] = useState(false);
  const [pendingChedReview, setPendingChedReview] = useState<{ reqId: string; status: string } | null>(null);

  // Dynamic IQA Schedule & Days States
  const [iqaSchedule, setIqaSchedule] = useState<any>(null);
  const [showEditIqaModal, setShowEditIqaModal] = useState(false);
  const [iqaFormData, setIqaFormData] = useState({ academic_year: "" });
  const [isSavingIqa, setIsSavingIqa] = useState(false);

  const [iqaDays, setIqaDays] = useState<any[]>(() => {
    return iqaDaysCache.get("2026 Recertification") || [];
  });
  const [isLoadingIqaDays, setIsLoadingIqaDays] = useState(false);
  const [showAddIqaDayModal, setShowAddIqaDayModal] = useState(false);
  const [showEditIqaDayModal, setShowEditIqaDayModal] = useState(false);
  const [showDeleteIqaDayModal, setShowDeleteIqaDayModal] = useState(false);
  const [editingIqaDay, setEditingIqaDay] = useState<any>(null);
  const [deletingIqaDay, setDeletingIqaDay] = useState<any>(null);

  const [iqaDayForm, setIqaDayForm] = useState({
    day_number: 1,
    day_date: "",
    title: "",
    scope: ""
  });
  const [isSavingIqaDay, setIsSavingIqaDay] = useState(false);

  // Dynamic AACCUP Program Accreditation & Upgrade Modal (Dynamic Level & History)
  const [programAccreditation, setProgramAccreditation] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({
    new_level: "Level I Accredited",
    valid_until_date: "",
    certificate_url: "",
    remarks: ""
  });
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Edit Program Standing (System Onboarding / Direct Baseline Calibration)
  const [showEditStandingModal, setShowEditStandingModal] = useState(false);
  const [editStandingForm, setEditStandingForm] = useState({
    new_level: "Level II Re-accredited",
    valid_until_date: ""
  });
  const [isSavingStanding, setIsSavingStanding] = useState(false);

  // Certificate Upload State (Historical Logs)
  const [showCertModal, setShowCertModal] = useState(false);
  const [targetHistoryId, setTargetHistoryId] = useState<string | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [isUploadingCert, setIsUploadingCert] = useState(false);

  const refreshData = async () => {
    try {
      const response = await apiClient.get(`/accreditation-status/${selectedProgram}`);
      setCurrentData(response.data);

      try {
        const accRes = await apiClient.get(`/accreditation/program/${selectedProgram}`);
        setProgramAccreditation(accRes.data);
        if (accRes.data?.active_areas) {
          const parsed = accRes.data.active_areas.split(",").map((s: string) => s.trim()).filter(Boolean);
          if (parsed.length > 0) {
            setActiveAreas(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to fetch program accreditation", err);
      }

      // Reload details for the currently expanded area (if any),
      // or eagerly fetch the first area so requirements paint correctly on first load
      if (expandedArea) {
        const detailsRes = await apiClient.get(`/accreditation-details/${selectedProgram}/${expandedArea.code}`);
        setAreaDetails(detailsRes.data);
        const updatedArea = response.data.areas.find((a: any) => a.code === expandedArea.code);
        if (updatedArea) setExpandedArea(updatedArea);
      } else if (response.data.areas && response.data.areas.length > 0) {
        // On first load with no area open, pre-fetch the first area's details
        // so the DB-seeded requirements are ready the moment the user expands any area
        const firstArea = response.data.areas[0];
        try {
          await apiClient.get(`/accreditation-details/${selectedProgram}/${firstArea.code}`);
        } catch (_) { /* non-critical pre-fetch, ignore errors */ }
      }
      
      if (userRole === "ADMIN" || userIsIqaAuditor) fetchPendingQueue();
      fetchChedData(); 
      fetchIsoCycles();
      fetchIsoData(selectedIsoCycleYear);
      fetchIqaDays(selectedIsoCycleYear);
      
    } catch (error) {
      console.error("Failed to refresh data", error);
    }
  };

  const handleSaveAreaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAreas.length === 0) {
      showToast("At least one AACCUP area must be active for evaluation.", "error");
      return;
    }
    setIsSavingAreaConfig(true);
    try {
      const token = sessionStorage.getItem("userToken");
      const headers: any = {};
      if (token && token !== "null" && token !== "undefined") {
        headers["Authorization"] = `Bearer ${token}`;
      }
      await apiClient.put(`/accreditation/program/${selectedProgram}`,
        { active_areas: activeAreas.join(",") },
        { headers, withCredentials: true }
      );
      showToast(`Active evaluation areas updated for ${selectedProgram} (${activeAreas.length}/10 active)!`, "success");
      setShowAreaConfigModal(false);
      await refreshData();
    } catch (error: any) {
      showToast(error.response?.data?.detail || "Failed to update area configuration.", "error");
    } finally {
      setIsSavingAreaConfig(false);
    }
  };

  const handleCertUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetHistoryId || !certFile) {
      showToast("Please select a certificate file to upload.", "error");
      return;
    }
    setIsUploadingCert(true);
    const formData = new FormData();
    formData.append("file", certFile);
    try {
      const token = sessionStorage.getItem("userToken");
      const headers: any = {};
      if (token && token !== "null" && token !== "undefined") {
        headers["Authorization"] = `Bearer ${token}`;
      }
      await apiClient.post(`/accreditation/history/${targetHistoryId}/upload-certificate`,
        formData,
        { headers, withCredentials: true }
      );
      showToast("Official Certificate uploaded and attached successfully!", "success");
      setShowCertModal(false);
      setCertFile(null);
      setTargetHistoryId(null);
      await refreshData();
    } catch (error: any) {
      showToast(error.response?.data?.detail || "Failed to upload certificate.", "error");
    } finally {
      setIsUploadingCert(false);
    }
  };

  const handleExportReport = () => {
    const historyList = programAccreditation?.history || [];
    if (historyList.length === 0) {
      showToast("No historical accreditation milestones available to export.", "warning");
      return;
    }

    const headers = ["Program", "Level Achieved", "Date Granted", "Valid Until", "Certificate URL", "Remarks"];
    const rows = historyList.map((item: any) => [
      `"${selectedProgram}"`,
      `"${(item.level_achieved || "").replace(/"/g, '""')}"`,
      `"${item.date_granted ? new Date(item.date_granted).toLocaleDateString() : ""}"`,
      `"${item.valid_until ? new Date(item.valid_until).toLocaleDateString() : "Indefinite"}"`,
      `"${item.certificate_url || "N/A"}"`,
      `"${(item.remarks || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedProgram}_Accreditation_History.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Accreditation history exported as ${selectedProgram}_Accreditation_History.csv`, "success");
  };

  const handleEditStandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStandingForm.new_level.trim()) {
      showToast("Please select or specify the accreditation level.", "error");
      return;
    }
    setIsSavingStanding(true);
    try {
      const token = sessionStorage.getItem("userToken");
      const headers: any = {};
      if (token && token !== "null" && token !== "undefined") {
        headers["Authorization"] = `Bearer ${token}`;
      }
      await apiClient.put(`/accreditation/program/${selectedProgram}`,
        editStandingForm,
        { headers, withCredentials: true }
      );
      showToast(`Program ${selectedProgram} standing updated to ${editStandingForm.new_level}!`, "success");
      setShowEditStandingModal(false);
      await refreshData();
    } catch (error: any) {
      showToast(error.response?.data?.detail || "Failed to update accreditation standing.", "error");
    } finally {
      setIsSavingStanding(false);
    }
  };

  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeForm.new_level.trim()) {
      showToast("Please select or specify the new accreditation level.", "error");
      return;
    }
    setIsUpgrading(true);
    try {
      const token = sessionStorage.getItem("userToken");
      const headers: any = {};
      if (token && token !== "null" && token !== "undefined") {
        headers["Authorization"] = `Bearer ${token}`;
      }
      await apiClient.post(`/accreditation/program/${selectedProgram}/upgrade`,
        upgradeForm,
        { headers, withCredentials: true }
      );
      showToast(`Program ${selectedProgram} officially upgraded to ${upgradeForm.new_level}!`, "success");
      setShowUpgradeModal(false);
      setUpgradeForm({ new_level: "Level I Accredited", valid_until_date: "", certificate_url: "", remarks: "" });
      await refreshData();
    } catch (error: any) {
      showToast(error.response?.data?.detail || "Failed to upgrade accreditation level.", "error");
    } finally {
      setIsUpgrading(false);
    }
  };

  const fetchIqaDays = async (cycleYear = selectedIsoCycleYear, force = false) => {
    const cached = iqaDaysCache.get(cycleYear);
    if (!force && cached && cached.length > 0) {
      setIqaDays(cached);
      return;
    }
    if (!cached || cached.length === 0) {
      setIsLoadingIqaDays(true);
    }
    try {
      const res = await apiClient.get(`/iso/schedule-days?cycle_year=${encodeURIComponent(cycleYear)}`);
      const data = res.data || [];
      iqaDaysCache.set(cycleYear, data);
      setIqaDays(data);
    } catch (error) {
      console.error("Failed to fetch IQA schedule days", error);
    } finally {
      setIsLoadingIqaDays(false);
    }
  };

  const fetchPendingQueue = async () => {
    try {
      const ts = new Date().getTime();
      const res = await apiClient.get(`/admin/accreditation-pending?_t=${ts}`);
      setPendingDocs(res.data || []);
    } catch (error) {
      console.error("Failed to fetch pending queue", error);
    }
    try {
      const ts = new Date().getTime();
      const isoRes = await apiClient.get(`/iso/evidences/pending?_t=${ts}`);
      setPendingIsoDocs(isoRes.data || []);
    } catch (error) {
      console.error("Failed to fetch pending ISO queue", error);
    }
  };

  const fetchChedData = async () => {
    setIsLoadingChed(true);
    try {
      const ts = new Date().getTime();
      const res = await apiClient.get(`/ched/requirements/${selectedProgram}?_t=${ts}`);
      setChedRequirements(res.data);
    } catch (error) {
      console.error("Failed to fetch CHED requirements");
    } finally {
      setIsLoadingChed(false);
    }
  };

  const fetchIsoCycles = async (force = false) => {
    if (!force && isoCyclesCache && isoCyclesCache.length > 0) {
      setIsoCycleOptions(isoCyclesCache);
      return;
    }
    try {
      const res = await apiClient.get("/iso/cycles");
      if (res.data && res.data.length > 0) {
        isoCyclesCache = res.data;
        setIsoCycleOptions(res.data);
        const currentYearStr = new Date().getFullYear().toString();
        const matchingCurrentYear = res.data.find((c: string) => c.includes(currentYearStr)) || res.data.find((c: string) => c.includes("2026")) || res.data[0];
        if (matchingCurrentYear) {
          setSelectedIsoCycleYear((prev: string) => {
            // Keep user selection if it already matches the current year/2026, otherwise switch to matchingCurrentYear
            return (prev && (prev.includes(currentYearStr) || prev.includes("2026"))) ? prev : matchingCurrentYear;
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch ISO audit cycles");
    }
  };

  const fetchIsoData = async (cycleYear = selectedIsoCycleYear, force = false) => {
    const cached = isoRequirementsCache.get(cycleYear);
    if (!force && cached && cached.length > 0) {
      setIsoRequirements(cached);
      setExpandedIsoClause((prev: any) => {
        if (!prev) return null;
        const updated = cached.find((r: any) => r.id === prev.id);
        return updated || null;
      });
      return;
    }

    if (!cached || cached.length === 0) {
      setIsLoadingIso(true);
    }
    try {
      const ts = new Date().getTime();
      const res = await apiClient.get(`/iso/requirements/GLOBAL?cycle_year=${encodeURIComponent(cycleYear)}&_t=${ts}`);
      const data = res.data || [];
      isoRequirementsCache.set(cycleYear, data);
      setIsoRequirements(data);
      setExpandedIsoClause((prev: any) => {
        if (!prev) return null;
        const updated = data.find((r: any) => r.id === prev.id);
        return updated || null;
      });
    } catch (error) {
      console.error("Failed to fetch ISO 9001:2015 requirements");
    } finally {
      setIsLoadingIso(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      setIsLoading(true);
      await refreshData();
      if (isMounted) setIsLoading(false);
    };

    loadInitialData();
    setExpandedArea(null);

    return () => { isMounted = false; };
  }, [selectedProgram]);


  const fetchQmsActionPlans = async (cycleYear = selectedIsoCycleYear, force = false) => {
    const cached = qmsPlansCache.get(cycleYear);
    if (!force && cached && cached.length > 0) {
      setQmsActionPlans(cached);
      return;
    }
    if (!cached || cached.length === 0) {
      setIsLoadingQmsPlans(true);
    }
    try {
      const ts = new Date().getTime();
      const res = await apiClient.get(`/qms/action-plans?cycle_year=${encodeURIComponent(cycleYear)}&_t=${ts}`);
      const data = res.data || [];
      qmsPlansCache.set(cycleYear, data);
      setQmsActionPlans(data);
    } catch (error) {
      console.error("Failed to fetch QMS Action Plans", error);
    } finally {
      setIsLoadingQmsPlans(false);
    }
  };

  const handleCreateQmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQmsPlan.opportunity_description.trim() || !newQmsPlan.action_plan.trim() || !newQmsPlan.target_date.trim()) {
      showToast("Please fill out all required fields.", "error");
      return;
    }
    setIsAddingQms(true);
    try {
      await apiClient.post("/qms/action-plans", {
        ...newQmsPlan,
        cycle_year: selectedIsoCycleYear
      });
      showToast("Digital QMS Action Plan created successfully!", "success");
      setShowAddQmsModal(false);
      setNewQmsPlan({
        auditee_office: sessionStorage.getItem('userAdministrativeOffice') || "HRMO",
        process_area: "",
        opportunity_type: "Process",
        opportunity_description: "",
        action_plan: "",
        target_date: "",
        personnel_responsible: "",
        status: "In Progress"
      });
      fetchQmsActionPlans(selectedIsoCycleYear, true);
    } catch (error) {
      showToast("Failed to create QMS Action Plan.", "error");
    } finally {
      setIsAddingQms(false);
    }
  };

  const handleEditQmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQmsPlan || !editingQmsPlan.opportunity_description.trim() || !editingQmsPlan.action_plan.trim()) {
      showToast("Please fill out all required fields.", "error");
      return;
    }
    setIsEditingQms(true);
    try {
      await apiClient.put(`/qms/action-plans/${editingQmsPlan.id}`, editingQmsPlan);
      showToast("QMS Action Plan updated!", "success");
      setShowEditQmsModal(false);
      setEditingQmsPlan(null);
      fetchQmsActionPlans(selectedIsoCycleYear, true);
    } catch (error) {
      showToast("Failed to update QMS Action Plan.", "error");
    } finally {
      setIsEditingQms(false);
    }
  };

  const handleDeleteQmsSubmit = async () => {
    if (!qmsPlanToDelete) return;
    setIsDeletingQms(true);
    try {
      await apiClient.delete(`/qms/action-plans/${qmsPlanToDelete.id}`);
      showToast("QMS Action Plan deleted.", "success");
      setShowDeleteQmsModal(false);
      setQmsPlanToDelete(null);
      fetchQmsActionPlans(selectedIsoCycleYear, true);
    } catch (error) {
      showToast("Failed to delete QMS Action Plan.", "error");
    } finally {
      setIsDeletingQms(false);
    }
  };

  const handleQuickStatusChangeQms = async (planId: string, newStatus: string) => {
    try {
      if (newStatus === "Completed") {
        const plan = qmsActionPlans.find(p => p.id === planId);
        if (plan) {
          setTargetQmsPlanForCloseout(plan);
          setCloseoutForm({
            actual_completion_date: plan.actual_completion_date || new Date().toISOString().split("T")[0],
            assessment_date: plan.assessment_date || new Date().toISOString().split("T")[0],
            assessment_notes: plan.assessment_notes || ""
          });
          setShowQmsCloseoutModal(true);
          return;
        }
      }
      await apiClient.put(`/qms/action-plans/${planId}`, { status: newStatus });
      showToast(`Status updated to "${newStatus}"`, "success");
      fetchQmsActionPlans(selectedIsoCycleYear, true);
    } catch (error) {
      showToast("Failed to update status.", "error");
    }
  };

  const handleUploadQmsEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetQmsPlanForEvidence || !qmsEvidenceFile || !qmsEvidenceDocName.trim()) {
      showToast("Please provide document name and select a file.", "error");
      return;
    }
    setIsUploadingQmsEvidence(true);
    try {
      const formData = new FormData();
      formData.append("file", qmsEvidenceFile);
      formData.append("document_name", qmsEvidenceDocName.trim());
      formData.append("uploaded_by", userName);

      await apiClient.post(`/qms/action-plans/${targetQmsPlanForEvidence.id}/upload-evidence`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      showToast("Evidence file attached to Action Plan!", "success");
      setShowQmsEvidenceUploadModal(false);
      setTargetQmsPlanForEvidence(null);
      setQmsEvidenceFile(null);
      setQmsEvidenceDocName("");
      fetchQmsActionPlans(selectedIsoCycleYear, true);
    } catch (error) {
      showToast("Failed to upload evidence.", "error");
    } finally {
      setIsUploadingQmsEvidence(false);
    }
  };

  const handleDeleteQmsEvidence = (evidence: any) => {
    setQmsEvidenceToDelete(evidence);
    setShowDeleteQmsEvidenceModal(true);
  };

  const confirmDeleteQmsEvidence = async () => {
    if (!qmsEvidenceToDelete) return;
    setIsDeletingQmsEvidence(true);
    try {
      await apiClient.delete(`/qms/action-plans/evidence/${qmsEvidenceToDelete.id}`);
      showToast("Attached evidence removed.", "success");
      setShowDeleteQmsEvidenceModal(false);
      setQmsEvidenceToDelete(null);
      fetchQmsActionPlans(selectedIsoCycleYear, true);
    } catch (error: any) {
      showToast("Failed to remove evidence.", "error");
    } finally {
      setIsDeletingQmsEvidence(false);
    }
  };

  const handleSaveCloseoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetQmsPlanForCloseout) return;
    setIsSavingCloseout(true);
    try {
      await apiClient.put(`/qms/action-plans/${targetQmsPlanForCloseout.id}`, {
        status: "Completed",
        actual_completion_date: closeoutForm.actual_completion_date || new Date().toISOString().split("T")[0],
        assessment_date: closeoutForm.assessment_date || null,
        assessment_notes: closeoutForm.assessment_notes || null
      });

      showToast("Closeout verification details saved!", "success");
      setShowQmsCloseoutModal(false);
      setTargetQmsPlanForCloseout(null);
      fetchQmsActionPlans(selectedIsoCycleYear, true);
    } catch (error) {
      showToast("Failed to save closeout verification.", "error");
    } finally {
      setIsSavingCloseout(false);
    }
  };

  useEffect(() => {
    if (activeTab === "iso") {
      fetchIsoCycles();
      fetchIsoData(selectedIsoCycleYear);
      fetchIqaDays(selectedIsoCycleYear);
      fetchQmsActionPlans(selectedIsoCycleYear);
    } else {
    }
  }, [selectedIsoCycleYear, activeTab]);

  useEffect(() => {
    if (isOfficeRestricted && userAdminOffice) {
      setIsoOfficeFilter(userAdminOffice);
      setQmsOfficeFilter(userAdminOffice);
    }
  }, [isOfficeRestricted, userAdminOffice]);

  const handleCreateIsoCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIsoCycleName.trim()) {
      showToast("Please enter an audit cycle name.", "error");
      return;
    }
    setIsCreatingCycle(true);
    try {
      const cycleName = newIsoCycleName.trim();
      await apiClient.post("/iso/cycles/init", {
        cycle_year: cycleName
      });
      showToast(`New Audit Cycle "${cycleName}" initialized!`, "success");
      isoCyclesCache = Array.from(new Set([cycleName, ...(isoCyclesCache || [])]));
      setIsoCycleOptions(prev => Array.from(new Set([cycleName, ...prev])));
      setSelectedIsoCycleYear(cycleName);
      setShowAddIsoCycleModal(false);
      setNewIsoCycleName("");
      await fetchIsoData(cycleName, true);
    } catch (error) {
      showToast("Failed to initialize new audit cycle.", "error");
    } finally {
      setIsCreatingCycle(false);
    }
  };

  const handleViewDetails = async (area: any) => {
    setExpandedArea(area);
    setIsLoadingDetails(true);
    try {
      const response = await apiClient.get(`/accreditation-details/${selectedProgram}/${area.code}`);
      setAreaDetails(response.data);
    } catch (error) {
      showToast("Failed to load area details.", "error");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const openUploadModal = (area: any) => {
    setUploadTargetArea(area);
    setUploadForm({ fileName: "", requirementTarget: "" });
    setSelectedFile(null);
    setShowUploadModal(true);
  };

  const openDeleteModal = (docName: string) => {
    setDocToDelete(docName);
    setShowDeleteModal(true);
  };

  const filteredAreas = currentData.areas.filter((area: any) => 
    area.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    area.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) setSelectedFile(e.dataTransfer.files[0]);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setSelectedFile(e.target.files[0]);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.fileName || !selectedFile) {
      showToast("Please provide a name and select a file.", "error"); return;
    }
    
    setIsUploading(true);
    const submitData = new FormData();
    submitData.append("file", selectedFile);
    submitData.append("document_name", uploadForm.fileName);
    submitData.append("program", selectedProgram);
    submitData.append("area_code", uploadTargetArea.code);
    submitData.append("requirement_target", uploadForm.requirementTarget);
    submitData.append("uploaded_by", userName);

    try {
      await apiClient.post("/upload-accreditation-evidence", submitData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      await refreshData();
      setUploadForm({ fileName: "", requirementTarget: "" });
      setSelectedFile(null); setShowUploadModal(false);
      showToast("Evidence uploaded! It is now pending Admin approval.", "success");
    } catch (error) {
      showToast("Failed to save evidence.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const executeDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/documents/${encodeURIComponent(docToDelete)}`);
      await refreshData();
      setShowDeleteModal(false); setDocToDelete(null);
      showToast("Document archived successfully!", "success");
    } catch (error) {
      showToast("Failed to archive document.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewDocument = (fileUrl: string, fileName: string) => {
    apiClient.post("/audit/access", {
      document_name: fileName, action_type: "View", user_email: sessionStorage.getItem('userEmail'), user_role: userRole
    }).catch(() => {});
    window.open(fileUrl, "_blank");
  };

  const handleAdminReview = async (docName: string, status: "Approved" | "Needs Revision", feedbackText: string = "") => {
    setIsReviewing(true);
    try {
      await apiClient.post("/admin/accreditation-review", {
        document_name: docName,
        status: status,
        feedback: feedbackText
      });
      showToast(`Document marked as ${status}!`, "success");
      setShowFeedbackModal(false);
      setFeedbackText("");
      await refreshData();
    } catch (error) {
      showToast("Failed to process review.", "error");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleChedUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.fileName || !selectedFile || !selectedChedReq) {
      showToast("Please provide all required fields.", "error"); return;
    }
    
    setIsUploading(true);
    const submitData = new FormData();
    submitData.append("file", selectedFile);
    submitData.append("requirement_id", selectedChedReq.id);
    submitData.append("document_name", uploadForm.fileName);
    submitData.append("uploaded_by", userName);
    submitData.append("program", selectedProgram);

    try {
      await apiClient.post("/ched/upload-evidence", submitData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      await fetchChedData();
      setUploadForm({ fileName: "", requirementTarget: "" });
      setSelectedFile(null); 
      setShowChedUploadModal(false);
      showToast("CHED Evidence uploaded! Pending Admin Review.", "success");
    } catch (error) {
      showToast("Failed to upload CHED evidence.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddChedRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingReq(true);
    try {
      await apiClient.post("/ched/requirements", {
        program: selectedProgram,
        cmo_name: newChedReq.cmo_name,
        description: newChedReq.description
      });
      showToast("New CHED requirement added to the checklist!", "success");
      setNewChedReq({ cmo_name: "", description: "" });
      setShowAddChedReqModal(false);
      fetchChedData();
    } catch (error) {
      showToast("Failed to add requirement.", "error");
    } finally {
      setIsAddingReq(false);
    }
  };

  const handleEditChedRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingReq(true);
    try {
      await apiClient.put(`/ched/requirements/${editingChedReq.id}`, {
        program: selectedProgram,
        cmo_name: editingChedReq.cmo_name,
        description: editingChedReq.description
      });
      showToast("Requirement updated!", "success");
      setShowEditChedModal(false);
      fetchChedData();
    } catch (error) {
      showToast("Failed to update requirement.", "error");
    } finally {
      setIsEditingReq(false);
    }
  };

  const confirmDeleteChedRequirement = (reqId: string) => {
    setChedReqToDelete(reqId);
    setShowDeleteChedReqModal(true);
  };

  const executeDeleteChedRequirement = async () => {
    if (!chedReqToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/ched/requirements/${chedReqToDelete}`);
      showToast("Requirement deleted.", "success");
      setShowDeleteChedReqModal(false);
      setChedReqToDelete(null);
      fetchChedData();
    } catch (error) {
      showToast("Failed to delete requirement.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- AACCUP REQUIREMENTS CRUD HANDLERS ---
  const handleCreateAaccupReq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAaccupReq.description.trim()) {
      showToast("Please enter requirement description.", "error"); return;
    }
    setIsAddingAaccupReq(true);
    try {
      await apiClient.post("/aaccup/requirements", newAaccupReq);
      showToast("New AACCUP requirement created successfully!", "success");
      setShowAddAaccupReqModal(false);
      setNewAaccupReq({ area_code: "Area I", area_title: "Vision, Mission, Goals and Objectives", description: "" });
      refreshData();
    } catch (err) {
      showToast("Failed to create AACCUP requirement.", "error");
    } finally {
      setIsAddingAaccupReq(false);
    }
  };

  const handleUpdateAaccupReq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAaccupReq || !editingAaccupReq.description.trim()) return;
    setIsEditingAaccupReq(true);
    try {
      await apiClient.put(`/aaccup/requirements/${editingAaccupReq.id}`, editingAaccupReq);
      showToast("AACCUP requirement updated successfully!", "success");
      setShowEditAaccupReqModal(false);
      setEditingAaccupReq(null);
      refreshData();
    } catch (err) {
      showToast("Failed to update AACCUP requirement.", "error");
    } finally {
      setIsEditingAaccupReq(false);
    }
  };

  const executeDeleteAaccupReq = async () => {
    if (!aaccupReqToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/aaccup/requirements/${aaccupReqToDelete.id}`);
      showToast("AACCUP requirement deleted.", "success");
      setShowDeleteAaccupReqModal(false);
      setAaccupReqToDelete(null);
      refreshData();
    } catch (err) {
      showToast("Failed to delete AACCUP requirement.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteChedEvidence = (evidence: any) => {
    setChedEvidenceToDelete(evidence);
    setShowDeleteChedEvidenceModal(true);
  };

  const executeDeleteChedEvidence = async () => {
    if (!chedEvidenceToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/ched/evidence/${chedEvidenceToDelete.id}`);
      showToast("Evidence removed.", "success");
      setShowDeleteChedEvidenceModal(false);
      setChedEvidenceToDelete(null);
      fetchChedData();
    } catch (error) {
      showToast("Failed to remove evidence.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmChedAdminReview = (reqId: string, status: string) => {
    setPendingChedReview({ reqId, status });
    setShowChedReviewModal(true);
  };

  const executeChedAdminReview = async () => {
    if (!pendingChedReview) return;
    setIsReviewing(true);
    try {
      await apiClient.put(`/ched/requirements/${pendingChedReview.reqId}/status`, { status: pendingChedReview.status });
      showToast(`Requirement marked as ${pendingChedReview.status}!`, "success");
      
      // Optimistic update
      setChedRequirements((prev: any[]) => prev.map(req => 
        req.id === pendingChedReview.reqId ? { ...req, status: pendingChedReview.status } : req
      ));

      setShowChedReviewModal(false);
      setPendingChedReview(null);
      fetchChedData();
    } catch (error) {
      showToast("Failed to update CHED requirement status.", "error");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleReviewChedEvidence = async (evidenceId: string, status: string) => {
    setIsReviewing(true);
    try {
      await apiClient.put(`/ched/evidence/${evidenceId}/status`, { status });
      showToast(`CHED evidence marked as ${status}!`, "success");
      
      // Optimistic update
      setChedRequirements((prev: any[]) => prev.map(req => {
        const hasEvidence = (req.evidences || []).some((ev: any) => ev.id === evidenceId);
        if (hasEvidence) {
          const updatedEvidences = (req.evidences || []).map((ev: any) => 
            ev.id === evidenceId ? { ...ev, status } : ev
          );
          return { ...req, evidences: updatedEvidences };
        }
        return req;
      }));

      fetchChedData();
    } catch (error) {
      showToast("Failed to update CHED evidence status.", "error");
    } finally {
      setIsReviewing(false);
    }
  };

  // --- ISO HANDLERS ---
  const handleIsoUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.fileName || !selectedFile || !selectedIsoReq) {
      showToast("Please provide document name and file.", "error"); return;
    }
    
    setIsUploading(true);
    const submitData = new FormData();
    submitData.append("file", selectedFile);
    submitData.append("requirement_id", selectedIsoReq.id);
    submitData.append("document_name", uploadForm.fileName);
    submitData.append("uploaded_by", userName);
    submitData.append("program", "GLOBAL");

    try {
      await apiClient.post("/iso/upload-evidence", submitData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      await fetchIsoData(selectedIsoCycleYear, true);
      fetchPendingQueue();
      setUploadForm({ fileName: "", requirementTarget: "" });
      setSelectedFile(null); 
      setShowIsoUploadModal(false);
      showToast("ISO Evidence uploaded successfully!", "success");
    } catch (error) {
      showToast("Failed to upload ISO evidence.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmIsoStatusUpdate = (reqId: string, status: string, title: string) => {
    setPendingIsoStatus({ reqId, status, title });
    setShowIsoStatusModal(true);
  };

  const executeIsoStatusUpdate = async () => {
    if (!pendingIsoStatus) return;
    setIsDeleting(true);
    try {
      await apiClient.put(`/iso/requirements/${pendingIsoStatus.reqId}/status`, { status: pendingIsoStatus.status });
      showToast(`ISO Clause marked as ${pendingIsoStatus.status}!`, "success");
      
      // Optimistic update
      setIsoRequirements((prev: any[]) => prev.map(r => r.id === pendingIsoStatus.reqId ? { ...r, status: pendingIsoStatus.status } : r));
      setExpandedIsoClause((prev: any) => prev && prev.id === pendingIsoStatus.reqId ? { ...prev, status: pendingIsoStatus.status } : prev);

      const wasRevoked = pendingIsoStatus.status === 'Not Compliant';

      setShowIsoStatusModal(false);
      setPendingIsoStatus(null);
      fetchIsoData(selectedIsoCycleYear, true);
      
      if (wasRevoked) {
        fetchQmsActionPlans(selectedIsoCycleYear, true);
      }
    } catch (error) {
      showToast("Failed to update ISO clause status.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteIsoEvidence = (evidence: any) => {
    setIsoEvidenceToDelete(evidence);
    setShowDeleteIsoEvidenceModal(true);
  };

  const executeDeleteIsoEvidence = async () => {
    if (!isoEvidenceToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/iso/evidence/${isoEvidenceToDelete.id}`);
      showToast("ISO evidence removed successfully.", "success");
      setShowDeleteIsoEvidenceModal(false);
      setIsoEvidenceToDelete(null);
      fetchIsoData(selectedIsoCycleYear, true);
      fetchPendingQueue();
    } catch (error) {
      showToast("Failed to remove ISO evidence.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReviewIsoEvidence = async (evidenceId: string, status: string, feedback: string = "") => {
    setIsReviewing(true);
    try {
      const token = sessionStorage.getItem("userToken");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token && token !== "null" && token !== "undefined") {
        headers["Authorization"] = `Bearer ${token}`;
      }
      await apiClient.put(`/iso/evidence/${evidenceId}/status`,
        { status, feedback },
        { headers, withCredentials: true }
      );
      showToast(`ISO evidence marked as ${status}!`, "success");
      
      // Optimistic update for the modal
      setExpandedIsoClause((prev: any) => {
        if (!prev) return null;
        const updatedEvidences = (prev.evidences || []).map((ev: any) =>
          ev.id === evidenceId ? { ...ev, status, admin_feedback: feedback } : ev
        );
        return { ...prev, evidences: updatedEvidences };
      });

      // Optimistic update for the main list
      setIsoRequirements((prev: any[]) => prev.map(r => {
        const hasEvidence = (r.evidences || []).some((ev: any) => ev.id === evidenceId);
        if (hasEvidence) {
          const updatedEvidences = (r.evidences || []).map((ev: any) =>
            ev.id === evidenceId ? { ...ev, status, admin_feedback: feedback } : ev
          );
          return { ...r, evidences: updatedEvidences };
        }
        return r;
      }));

      fetchIsoData(selectedIsoCycleYear, true);
      fetchPendingQueue();
      
      setShowIsoFeedbackModal(false);
      setIsoFeedbackText("");
      setIsoFeedbackDoc(null);
    } catch (error) {
      showToast("Failed to update evidence status.", "error");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleAddIsoRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIsoReq.title.trim() || !newIsoReq.description.trim() || !newIsoReq.iso_clause.trim()) {
      showToast("Please fill out all required fields.", "error"); return;
    }
    setIsAddingIsoReq(true);
    try {
      await apiClient.post("/iso/requirements", {
        program: "GLOBAL",
        iso_clause: newIsoReq.iso_clause.trim(),
        title: newIsoReq.title.trim(),
        description: newIsoReq.description.trim(),
        auditee_office: newIsoReq.auditee_office,
        risk_level: newIsoReq.risk_level,
        cycle_year: selectedIsoCycleYear
      });
      showToast(`New ISO Clause (${newIsoReq.iso_clause}) added to ${selectedIsoCycleYear}!`, "success");
      setNewIsoReq({
        iso_clause: "",
        title: "",
        description: "",
        auditee_office: ISO_OFFICES_16[0],
        risk_level: "Medium"
      });
      setShowAddIsoReqModal(false);
      fetchIsoData(selectedIsoCycleYear, true);
    } catch (error) {
      showToast("Failed to add ISO requirement.", "error");
    } finally {
      setIsAddingIsoReq(false);
    }
  };

  const handleDeleteIsoRequirement = async (reqId: string) => {
    const req = isoRequirements.find(r => r.id === reqId);
    if (req) {
      setIsoReqToDelete(req);
      setShowDeleteIsoReqModal(true);
    }
  };

  const handleEditIsoRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIsoReq || !editingIsoReq.title.trim() || !editingIsoReq.description.trim() || !editingIsoReq.iso_clause.trim()) {
      showToast("Please fill out all required fields.", "error"); return;
    }
    setIsEditingIsoReq(true);
    try {
      await apiClient.put(`/iso/requirements/${editingIsoReq.id}`, {
        program: "GLOBAL",
        iso_clause: editingIsoReq.iso_clause.trim(),
        title: editingIsoReq.title.trim(),
        description: editingIsoReq.description.trim(),
        auditee_office: editingIsoReq.auditee_office,
        risk_level: editingIsoReq.risk_level,
        cycle_year: editingIsoReq.cycle_year || selectedIsoCycleYear
      });
      showToast("ISO Clause requirement updated!", "success");
      setShowEditIsoModal(false);
      setEditingIsoReq(null);
      fetchIsoData(selectedIsoCycleYear, true);
    } catch (error) {
      showToast("Failed to update ISO requirement.", "error");
    } finally {
      setIsEditingIsoReq(false);
    }
  };

  const executeDeleteIsoRequirement = async () => {
    if (!isoReqToDelete) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/iso/requirements/${isoReqToDelete.id}`);
      showToast("ISO requirement deleted.", "success");
      setShowDeleteIsoReqModal(false);
      setIsoReqToDelete(null);
      fetchIsoData(selectedIsoCycleYear, true);
    } catch (error) {
      showToast("Failed to delete ISO requirement.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveIqaSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingIqa(true);
    try {
      await apiClient.put(`/iso/schedule/GLOBAL`, iqaFormData);
      showToast("IQA Audit Schedule updated for upcoming cycle!", "success");
      setShowEditIqaModal(false);
      fetchIqaSchedule();
    } catch (error) {
      showToast("Failed to update IQA schedule.", "error");
    } finally {
      setIsSavingIqa(false);
    }
  };

  const handleAddIqaDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iqaDayForm.title.trim() || !iqaDayForm.day_date.trim()) {
      showToast("Please fill out all required fields.", "error"); return;
    }
    setIsSavingIqaDay(true);
    try {
      await apiClient.post("/iso/schedule-days", {
        ...iqaDayForm,
        cycle_year: selectedIsoCycleYear
      });
      showToast("New IQA Audit Day added!", "success");
      setShowAddIqaDayModal(false);
      setIqaDayForm({ day_number: iqaDays.length + 1, day_date: "", title: "", scope: "" });
      fetchIqaDays(selectedIsoCycleYear, true);
    } catch (error) {
      showToast("Failed to add IQA Audit Day.", "error");
    } finally {
      setIsSavingIqaDay(false);
    }
  };

  const handleEditIqaDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIqaDay || !editingIqaDay.title.trim() || !editingIqaDay.day_date.trim()) {
      showToast("Please fill out all required fields.", "error"); return;
    }
    setIsSavingIqaDay(true);
    try {
      await apiClient.put(`/iso/schedule-days/${editingIqaDay.id}`, {
        ...editingIqaDay,
        cycle_year: selectedIsoCycleYear
      });
      showToast("IQA Audit Day updated!", "success");
      setShowEditIqaDayModal(false);
      setEditingIqaDay(null);
      fetchIqaDays(selectedIsoCycleYear, true);
    } catch (error) {
      showToast("Failed to update IQA Audit Day.", "error");
    } finally {
      setIsSavingIqaDay(false);
    }
  };

  const executeDeleteIqaDay = async () => {
    if (!deletingIqaDay) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/iso/schedule-days/${deletingIqaDay.id}`);
      showToast("IQA Audit Day removed.", "success");
      setShowDeleteIqaDayModal(false);
      setDeletingIqaDay(null);
      fetchIqaDays(selectedIsoCycleYear, true);
    } catch (error) {
      showToast("Failed to remove IQA Audit Day.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- DYNAMIC ISO COMPLIANCE MATH & SEARCH FILTERING ---
  const filteredIsoReqs = isoRequirements.filter(req => {
    const matchesOffice = isOfficeMatch(req.auditee_office, isoOfficeFilter);
    const matchesCategory = isoFilterCategory === "all" || getIsoProcessCategory(req) === isoFilterCategory;
    const matchesStatus = isoStatusFilter === "all" || (req.status || "Not Compliant").toLowerCase() === isoStatusFilter.toLowerCase();
    const q = isoSearchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      (req.iso_clause && req.iso_clause.toLowerCase().includes(q)) ||
      (req.title && req.title.toLowerCase().includes(q)) ||
      (req.description && req.description.toLowerCase().includes(q)) ||
      (req.auditee_office && req.auditee_office.toLowerCase().includes(q)) ||
      (req.risk_level && req.risk_level.toLowerCase().includes(q));
    return matchesOffice && matchesCategory && matchesStatus && matchesQuery;
  });
  const isoTotalCount = filteredIsoReqs.length;
  const isoCompliantCount = filteredIsoReqs.filter(r => r.status === 'Compliant').length;
  const isoCompliancePercentage = isoTotalCount === 0 ? 0 : Math.round((isoCompliantCount / isoTotalCount) * 100);
  const cycleTotalCount = isoRequirements.length;
  const cycleCompliantCount = isoRequirements.filter(r => r.status === 'Compliant').length;

  // --- DYNAMIC QMS ACTION PLANS FILTERING ---
  const filteredQmsPlans = qmsActionPlans.filter(p => {
    const matchesOffice = qmsOfficeFilter === 'all' || p.auditee_office === qmsOfficeFilter;
    const matchesType = qmsTypeFilter === 'all' || p.opportunity_type === qmsTypeFilter;
    const matchesStatus = qmsStatusFilter === 'all' || p.status === qmsStatusFilter;
    const q = qmsSearchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      (p.process_area && p.process_area.toLowerCase().includes(q)) ||
      (p.opportunity_description && p.opportunity_description.toLowerCase().includes(q)) ||
      (p.action_plan && p.action_plan.toLowerCase().includes(q)) ||
      (p.personnel_responsible && p.personnel_responsible.toLowerCase().includes(q)) ||
      (p.auditee_office && p.auditee_office.toLowerCase().includes(q));
    return matchesOffice && matchesType && matchesStatus && matchesQuery;
  });

  const qmsStats = {
    total: qmsActionPlans.length,
    inProgress: qmsActionPlans.filter(p => p.status === 'In Progress' || p.status === 'Proposed').length,
    completed: qmsActionPlans.filter(p => p.status === 'Completed').length,
    overdue: qmsActionPlans.filter(p => p.status !== 'Completed' && p.target_date && new Date(p.target_date) < new Date()).length
  };

  // Calculate CHED Compliance Math
  const chedCompliantCount = chedRequirements.filter(r => r.status === 'Compliant').length;
  const chedTotalCount = chedRequirements.length;
  const chedCompliancePercentage = chedTotalCount === 0 ? 0 : Math.round((chedCompliantCount / chedTotalCount) * 100);
  
  // Composite Institutional QA Readiness Index (40% AACCUP, 30% CHED, 30% ISO QMS)
  const aaccupScore = currentData.overall || 0;
  const chedScore = chedCompliancePercentage || 0;
  const isoScore = isoCompliancePercentage || 0;
  const compositeQaScore = Math.round((aaccupScore * 0.40) + (chedScore * 0.30) + (isoScore * 0.30));
  
  // COMBINE AACCUP, CHED, AND ISO PENDING DOCS FOR THE TOP QUEUE
  const chedPendingDocs = chedRequirements.filter(r => r.status === 'Pending').map(r => ({
    id: r.id,
    type: 'CHED',
    name: r.evidences && r.evidences.length > 0 ? r.evidences[0].document_name : 'Attached Evidence',
    target: r.description,
    program: r.program,
    area_code: r.cmo_name,
    uploaded_by: r.evidences && r.evidences.length > 0 ? r.evidences[0].uploaded_by : 'Unknown',
    date: r.evidences && r.evidences.length > 0 ? r.evidences[0].upload_date.split('T')[0] : 'Recently',
    url: r.evidences && r.evidences.length > 0 ? r.evidences[0].file_url : '#'
  }));
  
  // Derive any locally loaded ISO pending evidences as fallback or realtime sync
  const localIsoPendingDocs = isoRequirements.flatMap((req: any) => 
    (req.evidences || [])
      .filter((ev: any) => ev.status === "Pending")
      .map((ev: any) => ({
        id: ev.id,
        type: 'ISO',
        name: ev.document_name,
        target: `${req.iso_clause}: ${req.title}`,
        program: 'Institutional QMS',
        area_code: req.auditee_office || 'Global',
        uploaded_by: ev.uploaded_by || 'Faculty / Staff',
        date: ev.upload_date ? ev.upload_date.split('T')[0] : 'Recently',
        url: ev.file_url
      }))
  );

  // Combine fetched pending ISO docs with local ones, deduplicating by id
  const combinedIsoPendingDocs = [
    ...pendingIsoDocs.map((d: any) => ({ ...d, type: 'ISO' })),
    ...localIsoPendingDocs
  ].filter((item, index, self) => index === self.findIndex(t => t.id === item.id));

  const allPendingReviews = [
    ...pendingDocs.map(d => ({...d, type: 'AACCUP'})), 
    ...chedPendingDocs,
    ...combinedIsoPendingDocs
  ];

  if (isLoading && currentData.areas.length === 0) {
    return <div className="flex justify-center items-center h-64 text-gray-500"><Loader2 className="h-8 w-8 animate-spin text-[#DD7230]" /></div>;
  }

  return (
    <div className="space-y-6 relative pb-10">
      
      {toast && (
        <div className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:right-8 sm:bottom-8 sm:max-w-sm px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 text-sm font-bold z-[100] transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in border ${
          toast.type === 'success' ? 'bg-gray-900 text-white border-gray-700' :
          toast.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
          toast.type === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-300' :
          'bg-blue-50 text-blue-700 border-blue-200'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-400 shrink-0" /> :
           toast.type === 'error' ? <AlertCircle className="h-5 w-5 text-red-500 shrink-0" /> :
           toast.type === 'warning' ? <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" /> :
           <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />}
          <span className="leading-snug flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-1 opacity-60 hover:opacity-100 cursor-pointer shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div>
        <h1 className="text-lg sm:text-xl text-gray-900 mb-1 font-semibold">QA & Accreditation Support</h1>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-1 hidden sm:block">Comprehensive quality assurance tracking across AACCUP, ISO, CHED monitoring, and accreditation results</p>
      </div>

      {/* --- GLOBAL ADMIN REVIEW QUEUE --- */}
      {(userRole === "ADMIN" || userIsIqaAuditor) && (
        <div className="bg-white rounded-xl shadow-2xs border border-gray-200 overflow-hidden mb-6 transition-all duration-300">
          <button
            onClick={() => setIsAdminQueueOpen(!isAdminQueueOpen)}
            className="w-full flex items-center justify-between p-4 sm:p-5 bg-white hover:bg-gray-50/70 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 text-gray-700 border border-gray-200 shrink-0">
                <ShieldAlert className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-semibold text-gray-900">Admin Review Queue</h2>
                  {allPendingReviews.length > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-md border border-amber-200/80 bg-amber-50 text-amber-800">
                      {allPendingReviews.length} pending
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {allPendingReviews.length} {allPendingReviews.length === 1 ? 'document requires' : 'documents require'} verification
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-500 transition-colors">
                {isAdminQueueOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </button>

          {isAdminQueueOpen && (
            <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50/40 animate-in slide-in-from-top-2 fade-in duration-300">
              {allPendingReviews.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-10 w-10 text-gray-400 mx-auto mb-2 opacity-50" />
                  <p className="text-gray-500 font-medium text-xs">All caught up! No pending documents in the queue.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {allPendingReviews.map((doc, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="px-2 py-0.5 text-[11px] font-medium rounded-md border border-gray-200 bg-gray-50 text-gray-700">
                            {doc.type} Verification
                          </span>
                          <span className="text-[11px] text-gray-400">{doc.date}</span>
                        </div>
                        
                        <h4 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-1" title={doc.name}>{doc.name}</h4>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-snug">Target: <span className="text-gray-700 font-medium">{doc.target}</span></p>
                      </div>

                      <div>
                        <div className="pt-2.5 border-t border-gray-100 space-y-1 mb-3 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-gray-500">{doc.type === 'ISO' ? 'Scope / Office:' : 'Program:'}</span>
                            <span className="font-medium text-gray-800 truncate max-w-[140px]">{doc.program} ({doc.area_code})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Uploaded by:</span>
                            <span className="font-medium text-gray-800 truncate max-w-[140px]">{doc.uploaded_by}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleViewDocument(doc.url, doc.name)}
                            className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title="View Document"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          {doc.type === 'AACCUP' ? (
                            <>
                              <button 
                                onClick={() => { setFeedbackDoc(doc); setShowFeedbackModal(true); }}
                                disabled={isReviewing}
                                className="flex-1 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Revise
                              </button>
                              <button 
                                onClick={() => { setPendingAaccupApprove(doc); setShowAaccupApproveModal(true); }}
                                disabled={isReviewing}
                                className="flex-1 py-1.5 bg-[#DD7230] hover:bg-[#c86324] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Approve
                              </button>
                            </>
                          ) : doc.type === 'CHED' ? (
                            <>
                              <button 
                                onClick={() => confirmChedAdminReview(doc.id, "Not Compliant")}
                                className="flex-1 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Revise
                              </button>
                              <button 
                                onClick={() => confirmChedAdminReview(doc.id, "Compliant")}
                                className="flex-1 py-1.5 bg-[#DD7230] hover:bg-[#c86324] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Approve
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => {
                                  setIsoFeedbackDoc({
                                    id: doc.id,
                                    document_name: doc.name,
                                    uploaded_by: doc.uploaded_by,
                                    office: doc.area_code
                                  });
                                  setIsoPendingStatus("Declined");
                                  setIsoFeedbackText("");
                                  setShowIsoFeedbackModal(true);
                                }}
                                disabled={isReviewing}
                                className="flex-1 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Revise
                              </button>
                              <button 
                                onClick={() => {
                                  setIsoFeedbackDoc({
                                    id: doc.id,
                                    document_name: doc.name,
                                    uploaded_by: doc.uploaded_by,
                                    office: doc.area_code
                                  });
                                  setIsoPendingStatus("Approved");
                                  setIsoFeedbackText("");
                                  setShowIsoFeedbackModal(true);
                                }}
                                disabled={isReviewing}
                                className="flex-1 py-1.5 bg-[#DD7230] hover:bg-[#c86324] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                              >
                                Approve
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto bg-gray-100/80 p-1 rounded-xl gap-1 no-scrollbar border border-gray-200">
          <TabsTrigger value="aaccup" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs text-gray-600 font-medium cursor-pointer transition-all text-xs sm:text-sm whitespace-nowrap flex-1">AACCUP</TabsTrigger>
          <TabsTrigger value="iso" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs text-gray-600 font-medium cursor-pointer transition-all text-xs sm:text-sm whitespace-nowrap flex-1"><span className="hidden sm:inline">ISO </span>Standards</TabsTrigger>
          <TabsTrigger value="ched" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs text-gray-600 font-medium cursor-pointer transition-all text-xs sm:text-sm whitespace-nowrap flex-1"><span className="hidden sm:inline">CHED </span>Monitoring</TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-xs text-gray-600 font-medium cursor-pointer transition-all text-xs sm:text-sm whitespace-nowrap flex-1"><span className="hidden sm:inline">Accreditation </span>Results</TabsTrigger>
        </TabsList>

        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {activeTab === 'iso' ? 'Institutional QMS' : 'Program Evaluation'}
            </h2>
            <p className="text-xs text-gray-500 hidden sm:block">
              {activeTab === 'iso' ? 'Campus-wide ISO 9001:2015 QMS (CTU Argao Campus).' : 'Tracking compliance templates per degree program.'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-80">
              {activeTab === 'iso' ? (
                <div className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 flex items-center justify-between cursor-not-allowed opacity-85 select-none" title="Disabled: ISO 9001:2015 is an Institutional Campus-Wide QMS and does not depend on degree programs.">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">CTU Argao Institutional Campus-Wide</span>
                  </div>
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-medium uppercase rounded">Global</span>
                </div>
              ) : (
                <>
                  <select 
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    disabled={userRole === 'FACULTY'}
                    className={`appearance-none w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] pr-10 ${
                      userRole === 'FACULTY' ? 'bg-gray-100 opacity-80 cursor-not-allowed' : 'bg-gray-50/50 cursor-pointer'
                    }`}
                  >
                    <option value="BEED">Bachelor of Elementary Education</option>
                    <option value="BSED_MATH">BSEd major in Mathematics</option>
                    <option value="BSED_ENGLISH">BSEd major in English</option>
                    <option value="BTLED_HE">BTLEd major in Home Economics</option>
                    <option value="AB_ELS">BA in English Language Studies</option>
                    <option value="AB_LIT">BA in Literature</option>
                    <option value="AB_PSYCH">BA in Psychology</option>
                    <option value="BSF">BS in Forestry</option>
                    <option value="BSA">BS in Agriculture</option>
                    <option value="BSES">BS in Environmental Science</option>
                    <option value="BSIE">BS in Industrial Engineering</option>
                    <option value="BSIT">BS in Information Technology</option>
                    <option value="BIT_AT">BIT major in Automotive Technology</option>
                    <option value="BIT_CT">BIT major in Computer Technology</option>
                    <option value="BIT_DT">BIT major in Drafting Technology</option>
                    <option value="BIT_ET">BIT major in Electronics Technology</option>
                    <option value="BSHM">BS in Hospitality Management</option>
                    <option value="BSTM">BS in Tourism Management</option>
                  </select>
                  {userRole === 'FACULTY' ? (
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  ) : (
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  )}
                </>
              )}
            </div>

            {activeTab !== 'iso' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1.5 px-3.5 py-2 bg-[#DD7230] text-white rounded-lg shadow-2xs w-full sm:w-auto justify-center">
                  <span className="font-semibold uppercase text-xs tracking-wide">
                    {programAccreditation?.current_level || currentData.level || "Candidate Status"}
                  </span>
                </div>
                {userRole === "ADMIN" && (
                  <button
                    onClick={() => {
                      setEditStandingForm({
                        new_level: programAccreditation?.current_level || "Candidate Status",
                        valid_until_date: programAccreditation?.valid_until ? programAccreditation.valid_until.split("T")[0] : ""
                      });
                      setShowEditStandingModal(true);
                    }}
                    className="p-2 bg-white border border-gray-200 hover:bg-orange-50/50 text-gray-600 hover:text-[#DD7230] rounded-lg shadow-2xs hover:border-[#DD7230]/40 transition-all cursor-pointer"
                    title="Edit Current Standing (System Onboarding / Calibration)"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <TabsContent value="aaccup" forceMount className={activeTab === 'aaccup' ? 'space-y-6 mt-6' : 'hidden'}>
          <AaccupTabContent
            currentData={currentData}
            filteredAreas={filteredAreas}
            selectedProgram={selectedProgram}
            userRole={userRole}
            userIsIqaAuditor={userIsIqaAuditor}
            isUnassignedFaculty={isUnassignedFaculty}
            isAdminQueueOpen={isAdminQueueOpen}
            setIsAdminQueueOpen={setIsAdminQueueOpen}
            pendingDocs={pendingDocs}
            expandedArea={expandedArea}
            setExpandedArea={setExpandedArea}
            handleViewDetails={handleViewDetails}
            areaDetails={areaDetails}
            isLoadingDetails={isLoadingDetails}
            setShowAreaConfigModal={setShowAreaConfigModal}
            setShowUploadModal={setShowUploadModal}
            setUploadTargetArea={setUploadTargetArea}
            setUploadForm={setUploadForm}
            setShowFeedbackModal={setShowFeedbackModal}
            setFeedbackDoc={setFeedbackDoc}
            setDocToDelete={setDocToDelete}
            setShowDeleteModal={setShowDeleteModal}
            handleAdminReview={handleAdminReview}
            isReviewing={isReviewing}
            setUpgradeForm={setUpgradeForm}
            setShowUpgradeModal={setShowUpgradeModal}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setShowAddAaccupReqModal={setShowAddAaccupReqModal}
            setNewAaccupReq={setNewAaccupReq}
            setEditingAaccupReq={setEditingAaccupReq}
            setShowEditAaccupReqModal={setShowEditAaccupReqModal}
            setAaccupReqToDelete={setAaccupReqToDelete}
            setShowDeleteAaccupReqModal={setShowDeleteAaccupReqModal}
          />
        </TabsContent>

        <TabsContent value="ched" forceMount className={activeTab === 'ched' ? 'mt-6 space-y-6' : 'hidden'}>
          <ChedTabContent
            chedRequirements={chedRequirements}
            isLoadingChed={isLoadingChed}
            selectedProgram={selectedProgram}
            userRole={userRole}
            userIsIqaAuditor={userIsIqaAuditor}
            isUnassignedFaculty={isUnassignedFaculty}
            setShowAddChedReqModal={setShowAddChedReqModal}
            setShowEditChedModal={setShowEditChedModal}
            setEditingChedReq={setEditingChedReq}
            setChedReqToDelete={setChedReqToDelete}
            setShowDeleteChedReqModal={setShowDeleteChedReqModal}
            setSelectedChedReq={setSelectedChedReq}
            setShowChedUploadModal={setShowChedUploadModal}
            setChedEvidenceToDelete={setChedEvidenceToDelete}
            setShowDeleteChedEvidenceModal={setShowDeleteChedEvidenceModal}
            handleReviewChedEvidence={handleReviewChedEvidence}
            isReviewing={isReviewing}
          />
        </TabsContent>

        <TabsContent value="iso" forceMount className={activeTab === 'iso' ? 'mt-6 space-y-6' : 'hidden'}>
          <IsoTabContent
            isoClauseRequirements={isoRequirements}
            isLoadingIso={isLoadingIso}
            selectedProgram={selectedProgram}
            userRole={userRole}
            userAdminOffice={userAdminOffice}
            isOfficeRestricted={isOfficeRestricted}
            isUnassignedFaculty={isUnassignedFaculty}
            selectedIsoCycleYear={selectedIsoCycleYear}
            setSelectedIsoCycleYear={setSelectedIsoCycleYear}
            showIsoYearFilter={showIsoYearFilter}
            setShowIsoYearFilter={setShowIsoYearFilter}
            isoCycleOptions={isoCycleOptions}
            expandedIsoClause={expandedIsoClause}
            setExpandedIsoClause={setExpandedIsoClause}
            isoClauseEvidences={expandedIsoClause?.evidences || []}
            isLoadingIsoEvidences={isLoadingIso}
            isoFilterCategory={isoFilterCategory}
            setIsoFilterCategory={setIsoFilterCategory}
            isoFilterOffice={isoOfficeFilter}
            setIsoFilterOffice={setIsoOfficeFilter}
            isoStatusFilter={isoStatusFilter}
            setIsoStatusFilter={setIsoStatusFilter}
            availableIsoOffices={availableIsoOffices}
            isoSearchQuery={isoSearchQuery}
            setIsoSearchQuery={setIsoSearchQuery}
            filteredIsoClauses={filteredIsoReqs}
            isoCompliantCount={isoCompliantCount}
            isoTotalCount={isoTotalCount}
            cycleTotalCount={cycleTotalCount}
            cycleCompliantCount={cycleCompliantCount}
            isoCompliancePercent={isoCompliancePercentage}
            iqaProgramSchedule={iqaSchedule}
            iqaAuditDays={iqaDays}
            qmsActionPlans={qmsActionPlans}
            isLoadingQms={isLoadingQmsPlans}
            qmsFilterOffice={qmsOfficeFilter}
            setQmsFilterOffice={setQmsOfficeFilter}
            qmsFilterType={qmsTypeFilter}
            setQmsFilterType={setQmsTypeFilter}
            qmsFilterStatus={qmsStatusFilter}
            setQmsFilterStatus={setQmsStatusFilter}
            qmsSearchQuery={qmsSearchQuery}
            setQmsSearchQuery={setQmsSearchQuery}
            qmsStats={qmsStats}
            filteredQmsPlans={filteredQmsPlans}
            isoSubTab={isoSubTab}
            setIsoSubTab={setIsoSubTab}
            setShowAddIsoCycleModal={setShowAddIsoCycleModal}
            setShowAddIsoReqModal={setShowAddIsoReqModal}
            setEditingIsoReq={setEditingIsoReq}
            setShowEditIsoReqModal={setShowEditIsoModal}
            setIsoReqToDelete={setIsoReqToDelete}
            setShowDeleteIsoReqModal={setShowDeleteIsoReqModal}
            setSelectedIsoReqForUpload={setSelectedIsoReq}
            setShowIsoUploadEvidenceModal={setShowIsoUploadModal}
            setIsoEvidenceToDelete={setIsoEvidenceToDelete}
            setShowDeleteIsoEvidenceModal={setShowDeleteIsoEvidenceModal}
            setShowEditIqaModal={setShowEditIqaModal}
            setShowAddIqaDayModal={setShowAddIqaDayModal}
            setEditingIqaDay={setEditingIqaDay}
            setShowEditIqaDayModal={setShowEditIqaDayModal}
            setDeletingIqaDay={setDeletingIqaDay}
            setShowDeleteIqaDayModal={setShowDeleteIqaDayModal}
            setShowAddQmsModal={setShowAddQmsModal}
            setEditingQmsPlan={setEditingQmsPlan}
            setShowEditQmsModal={setShowEditQmsModal}
            setQmsPlanToDelete={setQmsPlanToDelete}
            setShowDeleteQmsModal={setShowDeleteQmsModal}
            setTargetQmsPlanForEvidence={setTargetQmsPlanForEvidence}
            setShowQmsEvidenceUploadModal={setShowQmsEvidenceUploadModal}
            handleReviewIsoEvidence={handleReviewIsoEvidence}
            handleUpdateQmsStatus={handleQuickStatusChangeQms}
            isReviewing={isReviewing}
            confirmIsoStatusUpdate={confirmIsoStatusUpdate}
            userIsIqaAuditor={userIsIqaAuditor}
            showToast={showToast}
            handleDeleteQmsEvidence={handleDeleteQmsEvidence}
            setIsoFeedbackDoc={setIsoFeedbackDoc}
            setIsoPendingStatus={setIsoPendingStatus}
            setShowIsoFeedbackModal={setShowIsoFeedbackModal}
            setIsoFeedbackText={setIsoFeedbackText}
          />
        </TabsContent>

        <TabsContent value="results" forceMount className={activeTab === 'results' ? 'mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500' : 'hidden'}>
          <ResultsTabContent
            currentData={currentData}
            selectedProgram={selectedProgram}
            userRole={userRole}
            programAccreditation={programAccreditation}
            setShowEditStandingModal={setShowEditStandingModal}
            setEditStandingForm={setEditStandingForm}
            setShowUpgradeModal={setShowUpgradeModal}
            setUpgradeForm={setUpgradeForm}
            accreditationLogs={programAccreditation?.history || []}
            showToast={showToast}
            setTargetHistoryId={setTargetHistoryId}
            setShowCertModal={setShowCertModal}
            handleViewDocument={handleViewDocument}
          />
        </TabsContent>
      </Tabs>

      {/* --- ADD AACCUP REQUIREMENT MODAL --- */}
      {showAddAaccupReqModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add AACCUP Area Requirement</h2>
                <p className="text-xs text-[#DD7230] font-semibold mt-0.5">{newAaccupReq.area_code} — {newAaccupReq.area_title}</p>
              </div>
              <button onClick={() => setShowAddAaccupReqModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAaccupReq} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">AACCUP Area</label>
                <select
                  value={newAaccupReq.area_code}
                  onChange={(e) => {
                    const code = e.target.value;
                    const titles: any = {
                      "Area I": "Vision, Mission, Goals and Objectives",
                      "Area II": "Faculty",
                      "Area III": "Curriculum and Instruction",
                      "Area IV": "Support to Students",
                      "Area V": "Research",
                      "Area VI": "Extension and Community Involvement",
                      "Area VII": "Library",
                      "Area VIII": "Physical Plant and Facilities",
                      "Area IX": "Laboratories",
                      "Area X": "Administration"
                    };
                    setNewAaccupReq({ ...newAaccupReq, area_code: code, area_title: titles[code] || "General Area" });
                  }}
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                >
                  <option value="Area I">Area I — Vision, Mission, Goals and Objectives</option>
                  <option value="Area II">Area II — Faculty</option>
                  <option value="Area III">Area III — Curriculum and Instruction</option>
                  <option value="Area IV">Area IV — Support to Students</option>
                  <option value="Area V">Area V — Research</option>
                  <option value="Area VI">Area VI — Extension and Community Involvement</option>
                  <option value="Area VII">Area VII — Library</option>
                  <option value="Area VIII">Area VIII — Physical Plant and Facilities</option>
                  <option value="Area IX">Area IX — Laboratories</option>
                  <option value="Area X">Area X — Administration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Requirement Title / Description <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={newAaccupReq.description}
                  onChange={(e) => setNewAaccupReq({ ...newAaccupReq, description: e.target.value })}
                  placeholder="e.g., Summary of Faculty Workload and Loading"
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddAaccupReqModal(false)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isAddingAaccupReq} className="px-5 py-2.5 bg-[#DD7230] hover:bg-[#DD7230] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer">
                  {isAddingAaccupReq ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Requirement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT AACCUP REQUIREMENT MODAL --- */}
      {showEditAaccupReqModal && editingAaccupReq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit AACCUP Requirement</h2>
                <p className="text-xs text-[#DD7230] font-semibold mt-0.5">{editingAaccupReq.area_code} — {editingAaccupReq.area_title}</p>
              </div>
              <button onClick={() => setShowEditAaccupReqModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateAaccupReq} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">Requirement Title / Description <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  value={editingAaccupReq.description}
                  onChange={(e) => setEditingAaccupReq({ ...editingAaccupReq, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEditAaccupReqModal(false)} className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isEditingAaccupReq} className="px-5 py-2.5 bg-[#DD7230] hover:bg-[#DD7230] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer">
                  {isEditingAaccupReq ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Requirement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE AACCUP REQUIREMENT CONFIRMATION MODAL --- */}
      <ReusableConfirmModal
        isOpen={showDeleteAaccupReqModal && !!aaccupReqToDelete}
        onClose={() => setShowDeleteAaccupReqModal(false)}
        onConfirm={executeDeleteAaccupReq}
        title="Delete AACCUP Requirement"
        description={`Are you sure you want to delete "${aaccupReqToDelete?.description}"? This action cannot be undone.`}
        confirmText="Delete Requirement"
        isProcessing={isDeleting}
      />

      {/* --- AACCUP UPLOAD MODAL --- */}
      {showUploadModal && uploadTargetArea && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F5F7FA]">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Upload Accreditation Evidence</h2>
                <p className="text-xs font-semibold text-[#DD7230] mt-1 uppercase tracking-wider">Tagging evidence for {selectedProgram}</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-orange-50/50 rounded-xl border border-[#DD7230]/10">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Target Area (Locked)</label>
                  <div className="text-sm font-bold text-[#DD7230]">{uploadTargetArea.code}</div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Category (Locked)</label>
                  <div className="text-sm font-bold text-[#DD7230]">Accreditation Evidence</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Document Name</label>
                <input
                  type="text" required value={uploadForm.fileName} onChange={(e) => setUploadForm({...uploadForm, fileName: e.target.value})}
                  className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-all font-medium text-sm"
                  placeholder="e.g., Faculty Credentials Summary 2026.pdf"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Fulfills Requirement</label>
                <select
                  required value={uploadForm.requirementTarget} onChange={(e) => setUploadForm({...uploadForm, requirementTarget: e.target.value})}
                  className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-all cursor-pointer font-medium text-sm"
                >
                  <option value="" disabled>Select the specific checklist requirement...</option>
                  {areaDetails.requirements.map((req: any) => (
                    <option key={req.id} value={req.text}>{req.text}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">File Upload</label>
                <div 
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    isDragging ? "border-[#DD7230] bg-[#FFF4E5]" : "border-gray-200 hover:border-[#DD7230] bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <FileText className="h-10 w-10 text-[#DD7230] mb-3" />
                      <p className="text-sm font-bold text-gray-900">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-bold text-gray-700">Drag or click to upload PDF/DOCX</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Max 50MB</p>
                    </div>
                  )}
                  <input type="file" accept=".pdf,.docx,.txt" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 px-5 py-3 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer uppercase tracking-wider">
                  Cancel
                </button>
                <button type="submit" disabled={!uploadForm.fileName || !uploadForm.requirementTarget || !selectedFile || isUploading} className="flex-1 px-5 py-3 text-sm font-bold bg-[#DD7230] text-white rounded-xl hover:bg-[#DD7230] disabled:opacity-50 transition-all flex justify-center items-center gap-2 cursor-pointer active:scale-95 shadow-md uppercase tracking-wider">
                  {isUploading ? <><Loader2 className="h-4 w-4 animate-spin"/> Processing...</> : "Submit Evidence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NEW CHED UPLOAD MODAL --- */}
      {showChedUploadModal && selectedChedReq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F5F7FA]">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Upload CHED Evidence</h2>
                <p className="text-xs font-semibold text-[#DD7230] mt-1 uppercase tracking-wider">Tagging for {selectedProgram}</p>
              </div>
              <button onClick={() => setShowChedUploadModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleChedUploadSubmit} className="p-6 space-y-5">
              <div className="p-4 bg-orange-50/50 rounded-xl border border-[#DD7230]/10">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Target Requirement (Locked)</label>
                <div className="text-sm font-bold text-gray-900">{selectedChedReq.description}</div>
                <div className="text-[10px] font-bold text-[#DD7230] uppercase tracking-wider mt-1">{selectedChedReq.cmo_name}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Document Name</label>
                <input
                  type="text" required value={uploadForm.fileName} onChange={(e) => setUploadForm({...uploadForm, fileName: e.target.value})}
                  className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-all font-medium text-sm"
                  placeholder="e.g., Dean's Transcript of Records 2026.pdf"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">File Upload</label>
                <div 
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    isDragging ? "border-[#DD7230] bg-[#FFF4E5]" : "border-gray-200 hover:border-[#DD7230] bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <FileText className="h-10 w-10 text-[#DD7230] mb-3" />
                      <p className="text-sm font-bold text-gray-900">{selectedFile.name}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-bold text-gray-700">Drag or click to upload PDF/DOCX</p>
                    </div>
                  )}
                  <input type="file" accept=".pdf,.docx,.txt" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowChedUploadModal(false)} className="flex-1 px-5 py-3 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer uppercase tracking-wider">
                  Cancel
                </button>
                <button type="submit" disabled={!uploadForm.fileName || !selectedFile || isUploading} className="flex-1 px-5 py-3 text-sm font-bold bg-[#DD7230] text-white rounded-xl hover:bg-[#DD7230] disabled:opacity-50 transition-all flex justify-center items-center gap-2 cursor-pointer active:scale-95 shadow-md uppercase tracking-wider">
                  {isUploading ? <><Loader2 className="h-4 w-4 animate-spin"/> Processing...</> : "Submit Evidence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADMIN ONLY: ADD CHED REQUIREMENT MODAL --- */}
      {showAddChedReqModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F5F7FA]">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Add Requirement</h2>
                <p className="text-xs font-semibold text-[#DD7230] mt-1 uppercase tracking-wider">Program: {selectedProgram}</p>
              </div>
              <button onClick={() => setShowAddChedReqModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleAddChedRequirement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">CMO Reference</label>
                <input
                  type="text" required value={newChedReq.cmo_name} onChange={(e) => setNewChedReq({...newChedReq, cmo_name: e.target.value})}
                  className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-all font-medium text-sm"
                  placeholder="e.g., CMO 25 series of 2015"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Requirement Description</label>
                <textarea
                  required value={newChedReq.description} onChange={(e) => setNewChedReq({...newChedReq, description: e.target.value})} rows={3}
                  className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-all font-medium text-sm resize-none"
                  placeholder="e.g., The Dean must hold a Master's degree in Information Technology."
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddChedReqModal(false)} className="flex-1 px-5 py-3 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer uppercase tracking-wider">
                  Cancel
                </button>
                <button type="submit" disabled={!newChedReq.cmo_name || !newChedReq.description || isAddingReq} className="flex-1 px-5 py-3 text-sm font-bold bg-[#DD7230] text-white rounded-xl hover:bg-[#DD7230] disabled:opacity-50 transition-all flex justify-center items-center gap-2 cursor-pointer active:scale-95 shadow-md uppercase tracking-wider">
                  {isAddingReq ? <><Loader2 className="h-4 w-4 animate-spin"/> Saving...</> : "Add to Checklist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADMIN ONLY: EDIT CHED REQUIREMENT MODAL --- */}
      {showEditChedModal && editingChedReq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F5F7FA]">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Edit Requirement</h2>
                <p className="text-xs font-semibold text-[#DD7230] mt-1 uppercase tracking-wider">Program: {selectedProgram}</p>
              </div>
              <button onClick={() => setShowEditChedModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleEditChedRequirement} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">CMO Reference</label>
                <input
                  type="text" required value={editingChedReq.cmo_name} onChange={(e) => setEditingChedReq({...editingChedReq, cmo_name: e.target.value})}
                  className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-all font-medium text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Requirement Description</label>
                <textarea
                  required value={editingChedReq.description} onChange={(e) => setEditingChedReq({...editingChedReq, description: e.target.value})} rows={3}
                  className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-all font-medium text-sm resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowEditChedModal(false)} className="flex-1 px-5 py-3 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer uppercase tracking-wider">
                  Cancel
                </button>
                <button type="submit" disabled={!editingChedReq.cmo_name || !editingChedReq.description || isEditingReq} className="flex-1 px-5 py-3 text-sm font-bold bg-[#DD7230] text-white rounded-xl hover:bg-[#DD7230] disabled:opacity-50 transition-all flex justify-center items-center gap-2 cursor-pointer active:scale-95 shadow-md uppercase tracking-wider">
                  {isEditingReq ? <><Loader2 className="h-4 w-4 animate-spin"/> Saving...</> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADMIN AACCUP FEEDBACK MODAL --- */}
      {showFeedbackModal && feedbackDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
            <div className="p-6 border-b border-red-50 bg-red-50 flex items-center gap-3">
              <MessageSquareWarning className="h-6 w-6 text-red-600" />
              <h2 className="text-xl font-bold text-red-700">Request Revision</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 leading-relaxed">
                You are requesting a revision for <strong className="text-gray-900">{feedbackDoc.name}</strong>. Please provide specific feedback for the faculty member.
              </p>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="e.g., 'Please upload the document with correct signatures'..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none text-sm font-medium"
              />
            </div>
            <div className="p-5 border-t border-gray-100 bg-[#F9FAFB] flex justify-end gap-3">
              <button onClick={() => setShowFeedbackModal(false)} disabled={isReviewing} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer uppercase tracking-widest">
                Cancel
              </button>
              <button 
                onClick={() => handleAdminReview(feedbackDoc.name, "Needs Revision", feedbackText)} 
                disabled={isReviewing || !feedbackText.trim()}
                className="px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer uppercase tracking-widest"
              >
                {isReviewing ? <><Loader2 className="h-3 w-3 animate-spin"/> Processing...</> : "Submit Feedback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ISO EVIDENCE AUDITOR VERIFICATION & FEEDBACK MODAL --- */}
      {showIsoFeedbackModal && isoFeedbackDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
            <div className={`p-5 border-b flex items-center justify-between ${
              isoPendingStatus === "Approved" ? "bg-emerald-50/90 border-emerald-100" : "bg-rose-50/90 border-rose-100"
            }`}>
              <div className="flex items-center gap-3">
                {isoPendingStatus === "Approved" ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <FileCheck className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                    <MessageSquareWarning className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <h2 className={`text-base font-bold ${
                    isoPendingStatus === "Approved" ? "text-emerald-900" : "text-rose-900"
                  }`}>
                    {isoPendingStatus === "Approved" ? "Approve ISO Evidence" : "Request Evidence Revision"}
                  </h2>
                  <p className="text-[11px] text-gray-500 font-medium">
                    ISO 9001:2015 Auditor Verification Loop
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIsoFeedbackModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Target Document</span>
                <p className="text-xs font-bold text-gray-900 mt-0.5 break-words">{isoFeedbackDoc.document_name}</p>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                  <span>Uploaded by: <strong className="text-gray-700">{isoFeedbackDoc.uploaded_by || "Faculty / Staff"}</strong></span>
                  {isoFeedbackDoc.office && <span>• Office: <strong className="text-gray-700">{isoFeedbackDoc.office}</strong></span>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Auditor Findings & Remarks</span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    {isoPendingStatus === "Approved" ? "Optional verification notes" : "Required for revision request"}
                  </span>
                </label>
                <textarea
                  value={isoFeedbackText}
                  onChange={(e) => setIsoFeedbackText(e.target.value)}
                  placeholder={
                    isoPendingStatus === "Approved"
                      ? "e.g., 'Document verified compliant with ISO Clause 7.5 documented information requirements. Approved without condition.'"
                      : "e.g., 'Missing document control number, or requires signature from unit head prior to audit acceptance'..."
                  }
                  rows={4}
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#DD7230] text-xs transition-all resize-none font-medium text-gray-800 leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-[#F9FAFB] flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowIsoFeedbackModal(false)}
                disabled={isReviewing}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReviewIsoEvidence(isoFeedbackDoc.id, isoPendingStatus, isoFeedbackText)}
                disabled={isReviewing || (isoPendingStatus !== "Approved" && !isoFeedbackText.trim())}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 ${
                  isoPendingStatus === "Approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isReviewing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...
                  </>
                ) : isoPendingStatus === "Approved" ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Confirm Approval
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5" /> Submit Revision Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- AACCUP DELETE/ARCHIVE MODAL --- */}
      <ReusableConfirmModal
        isOpen={showDeleteModal && !!docToDelete}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={executeDelete}
        isProcessing={isDeleting}
        title="Delete Evidence"
        confirmText="Yes, Delete"
        icon={Trash2}
        description={
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              Are you sure you want to remove this attached evidence?
            </p>
            {docToDelete && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 font-medium mt-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#DD7230] shrink-0" />
                <span className="font-semibold text-gray-900">{docToDelete}</span>
              </div>
            )}
          </>
        }
      />

      {/* --- CHED DELETE REQUIREMENT MODAL --- */}
      <ReusableConfirmModal
        isOpen={showDeleteChedReqModal && !!chedReqToDelete}
        onClose={() => setShowDeleteChedReqModal(false)}
        onConfirm={executeDeleteChedRequirement}
        isProcessing={isDeleting}
        title="Delete Requirement"
        confirmText="Yes, Delete"
        icon={Trash2}
        description={
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              Are you sure you want to remove this requirement?
            </p>
            {chedReqToDelete && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 font-medium mt-2">
                <span className="font-semibold text-gray-900">{chedReqToDelete.indicator}: {chedReqToDelete.title}</span>
              </div>
            )}
          </>
        }
      />

      {/* --- CHED DELETE EVIDENCE MODAL --- */}
      <ReusableConfirmModal
        isOpen={showDeleteChedEvidenceModal && !!chedEvidenceToDelete}
        onClose={() => setShowDeleteChedEvidenceModal(false)}
        onConfirm={executeDeleteChedEvidence}
        isProcessing={isDeleting}
        title="Delete Evidence"
        confirmText="Yes, Delete"
        icon={Trash2}
        description={
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              Are you sure you want to remove this attached evidence?
            </p>
            {chedEvidenceToDelete && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 font-medium mt-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#DD7230] shrink-0" />
                <span className="font-semibold text-gray-900">{chedEvidenceToDelete.document_name}</span>
              </div>
            )}
          </>
        }
      />

      {/* --- ISO UPLOAD EVIDENCE MODAL --- */}
      {showIsoUploadModal && selectedIsoReq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-t-4 border-t-[#DD7230]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Upload ISO Clause Evidence</h2>
                <p className="text-xs font-semibold text-[#DD7230] mt-1">{selectedIsoReq.iso_clause}: {selectedIsoReq.title}</p>
              </div>
              <button onClick={() => setShowIsoUploadModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleIsoUploadSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-2 uppercase tracking-wider">
                  Target Clause & Office
                </label>
                <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100 text-xs space-y-1">
                  <p className="font-bold text-[#1F2937]">{selectedIsoReq.auditee_office}</p>
                  <p className="text-gray-600 leading-snug">{selectedIsoReq.description}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Document Title / File Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uploadForm.fileName}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })}
                  placeholder="e.g. Risk Assessment Matrix 2025.pdf"
                  required
                  className="w-full px-4 py-3 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Select Evidence Document (PDF/Image) <span className="text-red-500">*</span>
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragging ? "border-[#DD7230] bg-orange-50" : "border-gray-300 hover:border-[#DD7230] bg-[#F5F7FA]"
                  }`}
                >
                  <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" />
                  <Upload className="h-8 w-8 text-[#DD7230] mx-auto mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-bold text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Click or drag & drop evidence file here</p>
                      <p className="text-xs text-gray-400 mt-1">Supports PDF, DOCX, PNG (Max 25MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowIsoUploadModal(false)} disabled={isUploading} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isUploading || !selectedFile || !uploadForm.fileName.trim()} className="px-5 py-2.5 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer">
                  {isUploading ? <><Loader2 className="h-4 w-4 animate-spin"/> Uploading...</> : "Submit Evidence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADMIN ADD ISO REQUIREMENT MODAL --- */}
      {showAddIsoReqModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Add ISO 9001:2015 Clause Requirement</h2>
                <p className="text-xs text-gray-500 mt-0.5">Configure a new quality audit checklist item for {selectedProgram}</p>
              </div>
              <button onClick={() => setShowAddIsoReqModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddIsoRequirement} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                    ISO Clause / Sub-clause <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newIsoReq.iso_clause}
                    onChange={(e) => setNewIsoReq({ ...newIsoReq, iso_clause: e.target.value })}
                    placeholder="e.g. Clause 7.1.5.2 or Clause 6.1"
                    required
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                    Risk Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newIsoReq.risk_level}
                    onChange={(e) => setNewIsoReq({ ...newIsoReq, risk_level: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  >
                    <option value="High">High Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="Low Risk">Low Risk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Auditee Office <span className="text-red-500">*</span>
                </label>
                <select
                  value={newIsoReq.auditee_office}
                  onChange={(e) => setNewIsoReq({ ...newIsoReq, auditee_office: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                >
                  {ISO_OFFICES_16.map((off) => (
                    <option key={off} value={off}>{off}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Requirement Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newIsoReq.title}
                  onChange={(e) => setNewIsoReq({ ...newIsoReq, title: e.target.value })}
                  placeholder="e.g. Risk Assessment Matrix & Attrition Plan"
                  required
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Audit Scope & Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newIsoReq.description}
                  onChange={(e) => setNewIsoReq({ ...newIsoReq, description: e.target.value })}
                  placeholder="Describe specific audit focus, required documentation, and verification criteria..."
                  rows={3}
                  required
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddIsoReqModal(false)} disabled={isAddingIsoReq} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isAddingIsoReq || !newIsoReq.title.trim()} className="px-5 py-2.5 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer">
                  {isAddingIsoReq ? <><Loader2 className="h-4 w-4 animate-spin"/> Adding...</> : "Add ISO Clause"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADMIN EDIT ISO REQUIREMENT MODAL --- */}
      {showEditIsoModal && editingIsoReq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Edit ISO Clause Requirement</h2>
                <p className="text-xs text-gray-500 mt-0.5">Modify clause details, auditee office, or risk classification</p>
              </div>
              <button onClick={() => setShowEditIsoModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditIsoRequirement} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                    ISO Clause / Sub-clause Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingIsoReq.iso_clause}
                    onChange={(e) => setEditingIsoReq({ ...editingIsoReq, iso_clause: e.target.value })}
                    placeholder="e.g. Clause 7.1.5.2 or Clause 6.1"
                    required
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                    Risk Level
                  </label>
                  <select
                    value={editingIsoReq.risk_level}
                    onChange={(e) => setEditingIsoReq({ ...editingIsoReq, risk_level: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  >
                    <option value="High">High Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="Low">Low Risk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Auditee Office
                </label>
                <select
                  value={editingIsoReq.auditee_office}
                  onChange={(e) => setEditingIsoReq({ ...editingIsoReq, auditee_office: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                >
                  {ISO_OFFICES_16.map((off) => (
                    <option key={off} value={off}>{off}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Requirement Title
                </label>
                <input
                  type="text"
                  value={editingIsoReq.title}
                  onChange={(e) => setEditingIsoReq({ ...editingIsoReq, title: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Audit Scope & Description
                </label>
                <textarea
                  value={editingIsoReq.description}
                  onChange={(e) => setEditingIsoReq({ ...editingIsoReq, description: e.target.value })}
                  rows={3}
                  required
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditIsoModal(false)} disabled={isEditingIsoReq} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isEditingIsoReq || !editingIsoReq.title.trim()} className="px-5 py-2.5 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer">
                  {isEditingIsoReq ? <><Loader2 className="h-4 w-4 animate-spin"/> Saving...</> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE ISO REQUIREMENT CONFIRMATION MODAL --- */}
      <ReusableConfirmModal
        isOpen={showDeleteIsoReqModal && !!isoReqToDelete}
        onClose={() => setShowDeleteIsoReqModal(false)}
        onConfirm={executeDeleteIsoRequirement}
        isProcessing={isDeleting}
        title="Delete Requirement"
        confirmText="Yes, Delete"
        icon={Trash2}
        description={
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              Are you sure you want to delete this requirement?
            </p>
            {isoReqToDelete && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 font-medium mt-2">
                <span className="font-semibold text-gray-900">{isoReqToDelete.iso_clause}: {isoReqToDelete.title}</span>
              </div>
            )}
          </>
        }
      />

      {/* --- EDIT 3-DAY IQA AUDIT PROGRAM SCHEDULE MODAL --- */}
      {showEditIqaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230] max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB] shrink-0">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Edit 3-Day IQA Audit Program Schedule</h2>
                <p className="text-xs text-gray-500 mt-0.5">Update annual audit cycle dates and focus areas for {selectedProgram}</p>
              </div>
              <button onClick={() => setShowEditIqaModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIqaSchedule} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Academic Year / Audit Cycle Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={iqaFormData.academic_year}
                  onChange={(e) => setIqaFormData({ ...iqaFormData, academic_year: e.target.value })}
                  placeholder="e.g. IQA Audit Cycle 2026-2027"
                  required
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              {/* Day 1 Inputs */}
              <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#DD7230] uppercase tracking-wider">Day 1 Schedule</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Day 1 Date</label>
                    <input
                      type="text"
                      value={iqaFormData.day1_date}
                      onChange={(e) => setIqaFormData({ ...iqaFormData, day1_date: e.target.value })}
                      placeholder="e.g. Sept 10, 2026"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Day 1 Title</label>
                    <input
                      type="text"
                      value={iqaFormData.day1_title}
                      onChange={(e) => setIqaFormData({ ...iqaFormData, day1_title: e.target.value })}
                      placeholder="Title / Phase Name"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Day 1 Scope & Focus</label>
                  <textarea
                    value={iqaFormData.day1_scope}
                    onChange={(e) => setIqaFormData({ ...iqaFormData, day1_scope: e.target.value })}
                    rows={2}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium resize-none"
                  />
                </div>
              </div>

              {/* Day 2 Inputs */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Day 2 Schedule</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Day 2 Date</label>
                    <input
                      type="text"
                      value={iqaFormData.day2_date}
                      onChange={(e) => setIqaFormData({ ...iqaFormData, day2_date: e.target.value })}
                      placeholder="e.g. Sept 11, 2026"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Day 2 Title</label>
                    <input
                      type="text"
                      value={iqaFormData.day2_title}
                      onChange={(e) => setIqaFormData({ ...iqaFormData, day2_title: e.target.value })}
                      placeholder="Title / Phase Name"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Day 2 Scope & Focus</label>
                  <textarea
                    value={iqaFormData.day2_scope}
                    onChange={(e) => setIqaFormData({ ...iqaFormData, day2_scope: e.target.value })}
                    rows={2}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium resize-none"
                  />
                </div>
              </div>

              {/* Day 3 Inputs */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#006837] uppercase tracking-wider">Day 3 Schedule</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Day 3 Date</label>
                    <input
                      type="text"
                      value={iqaFormData.day3_date}
                      onChange={(e) => setIqaFormData({ ...iqaFormData, day3_date: e.target.value })}
                      placeholder="e.g. Sept 12, 2026"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Day 3 Title</label>
                    <input
                      type="text"
                      value={iqaFormData.day3_title}
                      onChange={(e) => setIqaFormData({ ...iqaFormData, day3_title: e.target.value })}
                      placeholder="Title / Phase Name"
                      required
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Day 3 Scope & Focus</label>
                  <textarea
                    value={iqaFormData.day3_scope}
                    onChange={(e) => setIqaFormData({ ...iqaFormData, day3_scope: e.target.value })}
                    rows={2}
                    required
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowEditIqaModal(false)} disabled={isSavingIqa} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingIqa || !iqaFormData.academic_year.trim()} className="px-5 py-2.5 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer">
                  {isSavingIqa ? <><Loader2 className="h-4 w-4 animate-spin"/> Saving...</> : "Save Annual Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- ADD DYNAMIC IQA AUDIT DAY MODAL --- */}
      {showAddIqaDayModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Add IQA Audit Day</h2>
                <p className="text-xs text-gray-500 mt-0.5">Configure a new audit phase date and scope for CTU Argao Campus QMS</p>
              </div>
              <button onClick={() => setShowAddIqaDayModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddIqaDaySubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                    Day Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={iqaDayForm.day_number}
                    onChange={(e) => setIqaDayForm({ ...iqaDayForm, day_number: parseInt(e.target.value) || 1 })}
                    required
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                    Audit Date (Calendar Picker) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={iqaDayForm.day_date}
                    onChange={(e) => setIqaDayForm({ ...iqaDayForm, day_date: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Phase Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={iqaDayForm.title}
                  onChange={(e) => setIqaDayForm({ ...iqaDayForm, title: e.target.value })}
                  placeholder="e.g. Context, Risk & Resource Audit"
                  required
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Audit Focus & Scope <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={iqaDayForm.scope}
                  onChange={(e) => setIqaDayForm({ ...iqaDayForm, scope: e.target.value })}
                  placeholder="Describe specific offices to be audited, target clauses, and verification criteria..."
                  rows={3}
                  required
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddIqaDayModal(false)} disabled={isSavingIqaDay} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingIqaDay || !iqaDayForm.title.trim() || !iqaDayForm.day_date.trim()} className="px-5 py-2.5 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer">
                  {isSavingIqaDay ? <><Loader2 className="h-4 w-4 animate-spin"/> Adding...</> : "Add Audit Day"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT DYNAMIC IQA AUDIT DAY MODAL --- */}
      {showEditIqaDayModal && editingIqaDay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Edit IQA Audit Day</h2>
                <p className="text-xs text-gray-500 mt-0.5">Modify date, phase title, or audit focus scope</p>
              </div>
              <button onClick={() => setShowEditIqaDayModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditIqaDaySubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                    Day Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editingIqaDay.day_number}
                    onChange={(e) => setEditingIqaDay({ ...editingIqaDay, day_number: parseInt(e.target.value) || 1 })}
                    required
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                    Audit Date (Calendar Picker) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={editingIqaDay.day_date}
                    onChange={(e) => setEditingIqaDay({ ...editingIqaDay, day_date: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Phase Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingIqaDay.title}
                  onChange={(e) => setEditingIqaDay({ ...editingIqaDay, title: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Audit Focus & Scope <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editingIqaDay.scope}
                  onChange={(e) => setEditingIqaDay({ ...editingIqaDay, scope: e.target.value })}
                  rows={3}
                  required
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditIqaDayModal(false)} disabled={isSavingIqaDay} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingIqaDay || !editingIqaDay.title.trim() || !editingIqaDay.day_date.trim()} className="px-5 py-2.5 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer">
                  {isSavingIqaDay ? <><Loader2 className="h-4 w-4 animate-spin"/> Saving...</> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE DYNAMIC IQA AUDIT DAY CONFIRMATION MODAL --- */}
      <ReusableConfirmModal
        isOpen={showDeleteIqaDayModal && !!deletingIqaDay}
        onClose={() => setShowDeleteIqaDayModal(false)}
        onConfirm={executeDeleteIqaDay}
        isProcessing={isDeleting}
        title="Delete Audit Day"
        confirmText="Yes, Delete"
        icon={Trash2}
        description={
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              Are you sure you want to delete this audit day?
            </p>
            {deletingIqaDay && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 font-medium mt-2 flex items-center gap-2">
                <span className="font-semibold text-gray-900">Day {deletingIqaDay.day_number}: {deletingIqaDay.title}</span>
              </div>
            )}
          </>
        }
      />


      {/* ===== UNIFORM CONFIRMATION MODALS ===== */}

      {/* AACCUP Approve Confirmation */}
      {showAaccupApproveModal && pendingAaccupApprove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border-t-4 border-t-[#006837]">
            <div className="p-6 border-b border-green-50 bg-green-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#006837] flex items-center justify-center shrink-0">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Confirm Approval</h2>
                <p className="text-xs text-gray-500 mt-0.5">AACCUP Accreditation Evidence Review</p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                You are about to approve the following evidence document:
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-sm font-bold text-gray-900">{pendingAaccupApprove.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Uploaded by {pendingAaccupApprove.uploaded_by} · {pendingAaccupApprove.program}</p>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">This will mark the document as <span className="font-bold text-green-700">Approved</span> and notify the uploader. This action can be reversed by requesting a revision afterward.</p>
            </div>
            <div className="p-5 border-t border-gray-100 bg-[#F9FAFB] flex justify-end gap-3">
              <button onClick={() => { setShowAaccupApproveModal(false); setPendingAaccupApprove(null); }} disabled={isReviewing} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                Cancel
              </button>
              <button onClick={async () => { await handleAdminReview(pendingAaccupApprove.name, "Approved"); setShowAaccupApproveModal(false); setPendingAaccupApprove(null); }} disabled={isReviewing} className="px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-[#006837] hover:bg-green-800 transition-all disabled:opacity-50 flex justify-center items-center gap-2 uppercase tracking-widest shadow-md cursor-pointer">
                {isReviewing ? <><Loader2 className="h-4 w-4 animate-spin"/> Approving...</> : <><Check className="h-4 w-4" /> Yes, Approve</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHED Admin Review Confirmation */}
      {showChedReviewModal && pendingChedReview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className={`bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border-t-4 ${pendingChedReview.status === 'Compliant' ? 'border-t-[#006837]' : 'border-t-red-600'}`}>
            <div className={`p-6 border-b flex items-center gap-3 ${pendingChedReview.status === 'Compliant' ? 'bg-green-50 border-green-50' : 'bg-red-50 border-red-50'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pendingChedReview.status === 'Compliant' ? 'bg-[#006837]' : 'bg-red-600'}`}>
                {pendingChedReview.status === 'Compliant' ? <CheckCircle className="h-5 w-5 text-white" /> : <AlertCircle className="h-5 w-5 text-white" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {pendingChedReview.status === 'Compliant' ? 'Confirm Approval' : 'Request Revision'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">CHED Monitoring Requirement Review</p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                {pendingChedReview.status === 'Compliant'
                  ? 'You are about to mark this CHED requirement as Compliant. This signals that all submitted evidence meets CHED standards.'
                  : 'You are about to mark this CHED requirement as Not Compliant. The faculty will be notified to revise and re-upload evidence.'}
              </p>
              <p className="text-xs text-gray-400">This action updates the compliance status immediately and is reflected in the CHED Monitoring dashboard.</p>
            </div>
            <div className="p-5 border-t border-gray-100 bg-[#F9FAFB] flex justify-end gap-3">
              <button onClick={() => { setShowChedReviewModal(false); setPendingChedReview(null); }} disabled={isReviewing} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                Cancel
              </button>
              <button onClick={executeChedAdminReview} disabled={isReviewing} className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 uppercase tracking-widest shadow-md cursor-pointer ${pendingChedReview.status === 'Compliant' ? 'bg-[#006837] hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'}`}>
                {isReviewing ? <><Loader2 className="h-4 w-4 animate-spin"/> Processing...</> : pendingChedReview.status === 'Compliant' ? <><Check className="h-4 w-4" /> Yes, Approve</> : 'Request Revision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISO Clause Status Change Confirmation */}
      {showIsoStatusModal && pendingIsoStatus && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className={`bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border-t-4 ${pendingIsoStatus.status === 'Compliant' ? 'border-t-[#006837]' : 'border-t-amber-500'}`}>
            <div className={`p-6 border-b flex items-center gap-3 ${pendingIsoStatus.status === 'Compliant' ? 'bg-green-50 border-green-50' : 'bg-amber-50 border-amber-50'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pendingIsoStatus.status === 'Compliant' ? 'bg-[#006837]' : 'bg-amber-500'}`}>
                {pendingIsoStatus.status === 'Compliant' ? <CheckCircle className="h-5 w-5 text-white" /> : <AlertCircle className="h-5 w-5 text-white" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {pendingIsoStatus.status === 'Compliant' ? 'Approve ISO Clause' : 'Revoke ISO Compliance'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">ISO 9001:2015 QMS Clause Status Update</p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                {pendingIsoStatus.status === 'Compliant'
                  ? 'You are about to mark this ISO clause as Compliant. This will count toward the campus-wide ISO QMS compliance score.'
                  : 'You are about to revoke the Compliant status of this ISO clause. It will return to Pending and reduce the campus QMS compliance score.'}
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Affected Clause</p>
                <p className="text-sm font-bold text-gray-900">{pendingIsoStatus.title}</p>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-[#F9FAFB] flex justify-end gap-3">
              <button onClick={() => { setShowIsoStatusModal(false); setPendingIsoStatus(null); }} disabled={isDeleting} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                Cancel
              </button>
              <button onClick={executeIsoStatusUpdate} disabled={isDeleting} className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 uppercase tracking-widest shadow-md cursor-pointer ${pendingIsoStatus.status === 'Compliant' ? 'bg-[#006837] hover:bg-green-800' : 'bg-amber-500 hover:bg-amber-600'}`}>
                {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin"/> Updating...</> : pendingIsoStatus.status === 'Compliant' ? <><Check className="h-4 w-4" /> Yes, Approve</> : 'Yes, Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ISO Evidence Delete Confirmation */}
      <ReusableConfirmModal
        isOpen={showDeleteIsoEvidenceModal && !!isoEvidenceToDelete}
        onClose={() => { setShowDeleteIsoEvidenceModal(false); setIsoEvidenceToDelete(null); }}
        onConfirm={executeDeleteIsoEvidence}
        isProcessing={isDeleting}
        title="Delete Evidence"
        confirmText="Yes, Delete"
        icon={Trash2}
        description={
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              Are you sure you want to remove this attached evidence?
            </p>
            {isoEvidenceToDelete && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 font-medium mt-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#DD7230] shrink-0" />
                <span className="font-semibold text-gray-900">{isoEvidenceToDelete.document_name}</span>
              </div>
            )}
          </>
        }
      />

      {/* Start New ISO Audit Cycle Modal */}
      {showAddIsoCycleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-lg font-bold text-[#1F2937]">Initialize New Audit Cycle</h2>
                <p className="text-xs text-gray-500 mt-0.5">Start a fresh annual ISO 9001:2015 audit cycle year</p>
              </div>
              <button onClick={() => setShowAddIsoCycleModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIsoCycle} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1.5 uppercase tracking-wider">
                  Audit Cycle Name / Year <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newIsoCycleName}
                  onChange={(e) => setNewIsoCycleName(e.target.value)}
                  placeholder="e.g. 2026 Recertification Audit or 2026-2027 Cycle"
                  required
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                  Initializing a new cycle automatically clones baseline ISO 9001:2015 clauses into a fresh pending state for the new year. All historical 100% compliance records and evidence from previous cycles will remain safely preserved in system archives.
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddIsoCycleModal(false)} disabled={isCreatingCycle} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isCreatingCycle || !newIsoCycleName.trim()} className="px-5 py-2.5 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer">
                  {isCreatingCycle ? <><Loader2 className="h-4 w-4 animate-spin"/> Initializing...</> : <><Plus className="h-4 w-4" /> Start Cycle</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD DIGITAL QMS ACTION PLAN MODAL --- */}
      {showAddQmsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Create QMS Action Plan (MRC Form 6)</h2>
                <p className="text-xs text-gray-500 mt-0.5">Digitize an Opportunity for Improvement across Process, People, or Paper</p>
              </div>
              <button onClick={() => setShowAddQmsModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQmsSubmit} className="p-6 space-y-4">
              {/* --- OCR AUTO-FILL SECTION --- */}
              <div className="p-4 bg-orange-50/50 border border-[#DD7230]/30 rounded-xl">
                <label className="text-xs font-bold text-[#DD7230] uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Sparkles className="h-3.5 w-3.5" /> AI Auto-Fill from CAR Form
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    disabled={isExtractingCar}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsExtractingCar(true);
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        const res = await apiClient.post("/api/extract-car-form", formData);
                        const data = res.data;
                        const combinedOpportunity = `FINDINGS:\n${data.findings}\n\nROOT CAUSE:\n${data.root_cause}`;
                        const combinedAction = `IMMEDIATE ACTION:\n${data.immediate_action}\n\nPROPOSED CORRECTIVE MEASURE:\n${data.corrective_measure}`;
                        setNewQmsPlan((prev: any) => ({
                          ...prev,
                          opportunity_type: "Process",
                          opportunity_description: combinedOpportunity.trim(),
                          action_plan: combinedAction.trim()
                        }));
                        showToast("CAR Form successfully extracted and populated!", "success");
                      } catch {
                        showToast("Failed to parse CAR form. Please fill manually.", "error");
                      } finally {
                        setIsExtractingCar(false);
                        e.target.value = "";
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#DD7230] file:text-white hover:file:bg-[#c45e22] file:cursor-pointer cursor-pointer disabled:opacity-50"
                  />
                  {isExtractingCar && <Loader2 className="h-4 w-4 animate-spin text-[#DD7230] shrink-0" />}
                </div>
                <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                  Upload a scanned CAR Form 1 (PDF or image). The AI will automatically extract Findings, Root Causes, Immediate Actions, and Corrective Measures into the fields below.
                </p>
              </div>
              {/* --- END OCR AUTO-FILL SECTION --- */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">
                    Auditee Office <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newQmsPlan.auditee_office}
                    onChange={(e) => setNewQmsPlan({ ...newQmsPlan, auditee_office: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                  >
                    {ISO_OFFICES_16.map((off) => (
                      <option key={off} value={off}>{off}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">
                    Process Area / Function <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newQmsPlan.process_area}
                    onChange={(e) => setNewQmsPlan({ ...newQmsPlan, process_area: e.target.value })}
                    placeholder="e.g., HR Recruitment & Faculty Loading"
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">
                  Opportunity Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["Process", "People", "Paper", "Risk/Opportunity"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewQmsPlan({ ...newQmsPlan, opportunity_type: cat })}
                      className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        newQmsPlan.opportunity_type === cat
                          ? "bg-[#DD7230] text-white border-[#DD7230] shadow-2xs"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">
                  Opportunity Identification (MRC Form 6) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={newQmsPlan.opportunity_description}
                  onChange={(e) => setNewQmsPlan({ ...newQmsPlan, opportunity_description: e.target.value })}
                  placeholder="Describe the opportunity for improvement, gap, or area needing action..."
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">
                  Proposed Action Plan <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={newQmsPlan.action_plan}
                  onChange={(e) => setNewQmsPlan({ ...newQmsPlan, action_plan: e.target.value })}
                  placeholder="Detail step-by-step corrective or preventive actions..."
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">
                    Target Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newQmsPlan.target_date}
                    onChange={(e) => setNewQmsPlan({ ...newQmsPlan, target_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">
                    Personnel Responsible <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newQmsPlan.personnel_responsible}
                    onChange={(e) => setNewQmsPlan({ ...newQmsPlan, personnel_responsible: e.target.value })}
                    placeholder="e.g. HR Director / CAS Dean"
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddQmsModal(false)} disabled={isAddingQms} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isAddingQms} className="px-5 py-2.5 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer">
                  {isAddingQms ? <><Loader2 className="h-4 w-4 animate-spin"/> Saving...</> : "Save Action Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT DIGITAL QMS ACTION PLAN MODAL --- */}
      {showEditQmsModal && editingQmsPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Edit QMS Action Plan</h2>
                <p className="text-xs text-gray-500 mt-0.5">Update Opportunity or Action Plan details</p>
              </div>
              <button onClick={() => setShowEditQmsModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditQmsSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">Auditee Office</label>
                  <select
                    value={editingQmsPlan.auditee_office}
                    onChange={(e) => setEditingQmsPlan({ ...editingQmsPlan, auditee_office: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] cursor-pointer"
                  >
                    {ISO_OFFICES_16.map((off) => (
                      <option key={off} value={off}>{off}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">Process Area</label>
                  <input
                    type="text"
                    required
                    value={editingQmsPlan.process_area}
                    onChange={(e) => setEditingQmsPlan({ ...editingQmsPlan, process_area: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">Opportunity Identification</label>
                <textarea
                  required
                  rows={2}
                  value={editingQmsPlan.opportunity_description}
                  onChange={(e) => setEditingQmsPlan({ ...editingQmsPlan, opportunity_description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">Proposed Action Plan</label>
                <textarea
                  required
                  rows={2}
                  value={editingQmsPlan.action_plan}
                  onChange={(e) => setEditingQmsPlan({ ...editingQmsPlan, action_plan: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">Target Date</label>
                  <input
                    type="date"
                    required
                    value={editingQmsPlan.target_date}
                    onChange={(e) => setEditingQmsPlan({ ...editingQmsPlan, target_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">Personnel Responsible</label>
                  <input
                    type="text"
                    required
                    value={editingQmsPlan.personnel_responsible}
                    onChange={(e) => setEditingQmsPlan({ ...editingQmsPlan, personnel_responsible: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditQmsModal(false)} disabled={isEditingQms} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isEditingQms} className="px-5 py-2.5 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer">
                  {isEditingQms ? <><Loader2 className="h-4 w-4 animate-spin"/> Saving...</> : "Update Action Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE QMS ACTION PLAN MODAL --- */}
      <ReusableConfirmModal
        isOpen={showDeleteQmsModal && !!qmsPlanToDelete}
        onClose={() => setShowDeleteQmsModal(false)}
        onConfirm={handleDeleteQmsSubmit}
        isProcessing={isDeletingQms}
        title="Delete Action Plan"
        confirmText="Yes, Delete"
        icon={Trash2}
        description={
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              Are you sure you want to delete this action plan?
            </p>
            {qmsPlanToDelete && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 font-medium mt-2 flex flex-col gap-1">
                <span className="font-bold text-gray-900">{qmsPlanToDelete.auditee_office}</span>
                <span>{qmsPlanToDelete.opportunity_description}</span>
              </div>
            )}
          </>
        }
      />

      {/* --- DELETE QMS EVIDENCE MODAL --- */}
      <ReusableConfirmModal
        isOpen={showDeleteQmsEvidenceModal && !!qmsEvidenceToDelete}
        onClose={() => { setShowDeleteQmsEvidenceModal(false); setQmsEvidenceToDelete(null); }}
        onConfirm={confirmDeleteQmsEvidence}
        isProcessing={isDeletingQmsEvidence}
        title="Delete Evidence"
        confirmText="Yes, Delete"
        icon={Trash2}
        description={
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              Are you sure you want to remove this attached evidence?
            </p>
            {qmsEvidenceToDelete && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 font-medium mt-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#DD7230] shrink-0" />
                <span className="font-semibold text-gray-900">{qmsEvidenceToDelete.document_name}</span>
              </div>
            )}
          </>
        }
      />

      {/* --- ATTACH QMS EVIDENCE / PROOF MODAL --- */}
      {showQmsEvidenceUploadModal && targetQmsPlanForEvidence && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border-t-4 border-t-[#DD7230]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#F9FAFB]">
              <div>
                <h2 className="text-xl font-bold text-[#1F2937]">Attach Proof of Execution</h2>
                <p className="text-xs text-gray-500 mt-0.5">Upload evidence file for {targetQmsPlanForEvidence.auditee_office} Action Plan</p>
              </div>
              <button onClick={() => setShowQmsEvidenceUploadModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadQmsEvidenceSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">
                  Document / Proof Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={qmsEvidenceDocName}
                  onChange={(e) => setQmsEvidenceDocName(e.target.value)}
                  placeholder="e.g. Approved Faculty Load Matrix 2026.pdf"
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">
                  Select Evidence File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                  onChange={(e) => setQmsEvidenceFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full px-4 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm text-gray-700 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-[#DD7230] hover:file:bg-orange-100"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowQmsEvidenceUploadModal(false)} disabled={isUploadingQmsEvidence} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isUploadingQmsEvidence || !qmsEvidenceFile} className="px-5 py-2.5 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer">
                  {isUploadingQmsEvidence ? <><Loader2 className="h-4 w-4 animate-spin"/> Uploading...</> : "Upload & Attach"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CLOSEOUT & AUDITOR ASSESSMENT VERIFICATION MODAL --- */}
      {showQmsCloseoutModal && targetQmsPlanForCloseout && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border-t-4 border-t-emerald-500">
            <div className="p-6 border-b border-emerald-100 bg-emerald-50/60 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-emerald-900">Action Plan Closeout Verification</h2>
                <p className="text-xs text-emerald-700 mt-0.5">Record completion dates and auditor assessment remarks for ISO closeout</p>
              </div>
              <button onClick={() => setShowQmsCloseoutModal(false)} className="p-2 hover:bg-emerald-100 rounded-full transition-colors cursor-pointer text-emerald-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCloseoutSubmit} className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1">
                <p className="font-bold text-gray-900">{targetQmsPlanForCloseout.auditee_office} — {targetQmsPlanForCloseout.process_area}</p>
                <p className="text-gray-600 line-clamp-2">"{targetQmsPlanForCloseout.action_plan}"</p>
                <p className="text-[#DD7230] font-bold">Target Date: {targetQmsPlanForCloseout.target_date}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">
                    Actual Date of Completion <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={closeoutForm.actual_completion_date}
                    onChange={(e) => setCloseoutForm({ ...closeoutForm, actual_completion_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">
                    Auditor Assessment Date
                  </label>
                  <input
                    type="date"
                    value={closeoutForm.assessment_date}
                    onChange={(e) => setCloseoutForm({ ...closeoutForm, assessment_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1 uppercase tracking-wider">
                  Auditor / Lead Closeout Verification Remarks
                </label>
                <textarea
                  rows={3}
                  value={closeoutForm.assessment_notes}
                  onChange={(e) => setCloseoutForm({ ...closeoutForm, assessment_notes: e.target.value })}
                  placeholder="Enter audit findings, verification method, or approval remarks..."
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowQmsCloseoutModal(false)} disabled={isSavingCloseout} className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSavingCloseout || !closeoutForm.actual_completion_date} className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer">
                  {isSavingCloseout ? <><Loader2 className="h-4 w-4 animate-spin"/> Saving...</> : "Verify & Complete Closeout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- OFFICIAL AACCUP ACCREDITATION LEVEL UPGRADE MODAL --- */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Award className="w-6 h-6 text-[#DD7230]" /> Officially Upgrade Accreditation Level
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Grant new official standing for <strong>{selectedProgram}</strong> & archive milestones to historical records
                </p>
              </div>
              <button onClick={() => setShowUpgradeModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpgradeSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  New Accreditation Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={upgradeForm.new_level}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, new_level: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                >
                  <option value="Candidate Status">Candidate Status</option>
                  <option value="Level I Candidate">Level I Candidate</option>
                  <option value="Level I Accredited">Level I Accredited</option>
                  <option value="Level II Re-accredited">Level II Re-accredited</option>
                  <option value="Level III Re-accredited">Level III Re-accredited</option>
                  <option value="Level IV Re-accredited">Level IV Re-accredited</option>
                  <option value="Center of Development (COD)">Center of Development (COD)</option>
                  <option value="Center of Excellence (COE)">Center of Excellence (COE)</option>
                  <option value="CHED Institutional Recognition">CHED Institutional Recognition</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Validity Period / Valid Until Date (Optional)
                </label>
                <input
                  type="date"
                  value={upgradeForm.valid_until_date}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, valid_until_date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Official Certificate URL / File Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={upgradeForm.certificate_url}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, certificate_url: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Auditor Remarks & Resolution Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Passed AACCUP 3rd cycle survey visit with a grand mean of 4.25."
                  value={upgradeForm.remarks}
                  onChange={(e) => setUpgradeForm({ ...upgradeForm, remarks: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  disabled={isUpgrading}
                  className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpgrading || !upgradeForm.new_level}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer"
                >
                  {isUpgrading ? <><Loader2 className="h-4 w-4 animate-spin"/> Upgrading...</> : "Grant Official Level"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT CURRENT PROGRAM STANDING MODAL (Onboarding / Calibration) --- */}
      {showEditStandingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-200">
            <div className="p-6 border-b border-gray-100 bg-[#F5F7FA] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-[#DD7230]" /> Edit Current Program Standing
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Directly calibrate the baseline accreditation level for <strong>{selectedProgram}</strong> without recording an audit hop
                </p>
              </div>
              <button onClick={() => setShowEditStandingModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditStandingSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Current Accreditation Standing <span className="text-red-500">*</span>
                </label>
                <select
                  value={editStandingForm.new_level}
                  onChange={(e) => setEditStandingForm({ ...editStandingForm, new_level: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                >
                  <option value="Candidate Status">Candidate Status</option>
                  <option value="Level I Candidate">Level I Candidate</option>
                  <option value="Level I Accredited">Level I Accredited</option>
                  <option value="Level II Re-accredited">Level II Re-accredited</option>
                  <option value="Level III Re-accredited">Level III Re-accredited</option>
                  <option value="Level IV Re-accredited">Level IV Re-accredited</option>
                  <option value="Certificate of Program Compliance (COPC)">Certificate of Program Compliance (COPC)</option>
                  <option value="Center of Development (COD)">Center of Development (COD)</option>
                  <option value="Center of Excellence (COE)">Center of Excellence (COE)</option>
                  <option value="CHED Institutional Recognition">CHED Institutional Recognition</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Valid Until Date (Optional)
                </label>
                <input
                  type="date"
                  value={editStandingForm.valid_until_date}
                  onChange={(e) => setEditStandingForm({ ...editStandingForm, valid_until_date: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#DD7230]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditStandingModal(false)}
                  disabled={isSavingStanding}
                  className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStanding || !editStandingForm.new_level}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer"
                >
                  {isSavingStanding ? <><Loader2 className="h-4 w-4 animate-spin"/> Saving...</> : "Save Standing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ATTACH OFFICIAL ACCREDITATION CERTIFICATE MODAL --- */}
      {showCertModal && targetHistoryId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border-t-4 border-t-[#006837]">
            <div className="p-6 border-b border-gray-100 bg-[#F5F7FA] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileBadge className="w-5 h-5 text-[#006837]" /> Attach Official Certificate
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Upload scanned PDF or certificate image for <strong>{selectedProgram}</strong>
                </p>
              </div>
              <button
                onClick={() => { setShowCertModal(false); setCertFile(null); setTargetHistoryId(null); }}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCertUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Certificate Document / Scanned PDF <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full px-4 py-2 bg-[#F5F7FA] border border-gray-200 rounded-xl text-sm text-gray-700 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-green-50 file:text-[#006837] hover:file:bg-green-100"
                />
                <p className="text-[11px] text-gray-500 mt-1.5">Supported formats: PDF, JPG, PNG (Max 25MB)</p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowCertModal(false); setCertFile(null); setTargetHistoryId(null); }}
                  disabled={isUploadingCert}
                  className="px-5 py-2.5 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingCert || !certFile}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#006837] hover:bg-[#00502a] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer"
                >
                  {isUploadingCert ? <><Loader2 className="h-4 w-4 animate-spin"/> Uploading...</> : "Upload & Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIGURE AACCUP ACTIVE EVALUATION AREAS MODAL --- */}
      {showAreaConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden ">
            <div className="p-6 border-b border-gray-100 bg-[#F5F7FA] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#DD7230]" /> Configure Active Evaluation Areas
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Scope the AACCUP criteria for <strong>{selectedProgram}</strong> (e.g., 4 mandatory areas for Level III / IV re-accreditation).
                </p>
              </div>
              <button
                onClick={() => setShowAreaConfigModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAreaConfig} className="p-6 space-y-4">
              {/* Presets */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Quick Presets:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAreas(MASTER_AACCUP_AREAS.map(a => a.code))}
                    className="text-[11px] font-bold text-[#DD7230] hover:underline bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded cursor-pointer transition-colors"
                  >
                    Select All Areas ({MASTER_AACCUP_AREAS.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAreas(["Area I", "Area II", "Area III", "Area V"])}
                    className="text-[11px] font-bold text-[#DD7230] hover:underline bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded cursor-pointer transition-colors"
                  >
                    Level III/IV Core (4 Areas)
                  </button>
                </div>
              </div>

              {/* Area Checklist */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {MASTER_AACCUP_AREAS.map((area: any) => {
                  const isChecked = activeAreas.includes(area.code);
                  return (
                    <label
                      key={area.code}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked ? "bg-orange-50/60 border-[#DD7230]/30" : "bg-gray-50 border-gray-200 opacity-70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setActiveAreas([...activeAreas, area.code]);
                          } else {
                            setActiveAreas(activeAreas.filter(c => c !== area.code));
                          }
                        }}
                        className="mt-1 rounded border-gray-300 text-[#DD7230] focus:ring-[#DD7230] h-4 w-4 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900">{area.code}</span>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${isChecked ? "bg-orange-100 text-[#DD7230]" : "bg-gray-200 text-gray-600"}`}>
                            {isChecked ? "Active" : "Excluded"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">{area.title}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">
                  {activeAreas.length} of {MASTER_AACCUP_AREAS.length} Areas Selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAreaConfigModal(false)}
                    disabled={isSavingAreaConfig}
                    className="px-4 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAreaConfig || activeAreas.length === 0}
                    className="px-5 py-2 text-xs font-bold text-white bg-[#DD7230] hover:bg-[#DD7230] rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest cursor-pointer"
                  >
                    {isSavingAreaConfig ? <><Loader2 className="h-4 w-4 animate-spin"/> Saving...</> : "Save Configuration"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

  </div>
  );
}