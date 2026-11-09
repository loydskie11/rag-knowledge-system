import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileClock,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router";
import { apiClient } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { assignmentLabel } from "../constants/academicScopes";
import { useRole } from "../contexts/RoleContext";
import type { PersonnelAssignment } from "../contexts/RoleContext";

type ProgramSummary = {
  code: string;
  college?: string;
  overall?: number;
  gaps?: number;
  evidence?: number;
  level?: string;
  unavailable?: boolean;
};

type DashboardData = {
  profile: { full_name: string; email: string; assignments: PersonnelAssignment[] };
  summary: { documents: number; queries: number; access_events: number; open_documents: number };
  attention: Array<{ kind: string; count: number; message: string; path?: string | null }>;
  recent_activity: Array<{ id: string; title: string; action: string; timestamp?: string }>;
  modules: {
    accreditation?: { programs: ProgramSummary[] };
    governance?: { offices?: string[]; iso_processes?: string[]; action_plans?: number; pending?: number; overdue?: number; unavailable?: boolean };
    survey?: { responses?: number; scope?: string; unavailable?: boolean };
    document_tracking?: { open: number; total: number; controller: boolean };
  };
  partial_errors: string[];
};

const ACADEMIC_TYPES = new Set(["COLLEGE_DEAN", "COLLEGE_SECRETARY", "PROGRAM_CHAIR", "FACULTY_MEMBER"]);
const GOVERNANCE_TYPES = new Set(["OFFICE_HEAD", "OFFICE_MEMBER", "QA_HEAD", "IQA_AUDITOR"]);
const SURVEY_TYPES = new Set(["OFFICE_HEAD", "QA_HEAD", "IQA_AUDITOR", "SURVEY_ANALYST"]);

function assignmentKey(assignment: PersonnelAssignment, index: number) {
  return assignment.id || `${assignment.assignment_type}-${assignment.scope_type}-${assignment.scope_id || assignment.scope_code || index}`;
}

function assignmentDescription(assignment: PersonnelAssignment) {
  const scope = assignment.scope_name || assignment.scope_code;
  return scope ? `${assignmentLabel(assignment.assignment_type)} · ${scope}` : assignmentLabel(assignment.assignment_type);
}

function formatActivityDate(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Recently"
    : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function PersonnelDashboard() {
  const navigate = useNavigate();
  const { profile, assignments: contextAssignments, permissions } = useRole();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState("ALL");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get<DashboardData>("/dashboard/personnel");
      setData(response.data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail || "The personnel dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDashboard(); }, []);

  const assignments = data?.profile.assignments || contextAssignments;
  const selectedAssignment = useMemo(() => {
    if (selectedKey === "ALL") return null;
    return assignments.find((assignment, index) => assignmentKey(assignment, index) === selectedKey) || null;
  }, [assignments, selectedKey]);

  const includesAssignment = (types: Set<string>) => {
    if (selectedAssignment) return types.has(selectedAssignment.assignment_type);
    return assignments.some((assignment) => types.has(assignment.assignment_type));
  };

  const visiblePrograms = useMemo(() => {
    const programs = data?.modules.accreditation?.programs || [];
    if (!selectedAssignment || !ACADEMIC_TYPES.has(selectedAssignment.assignment_type)) return programs;
    const scope = selectedAssignment.scope_name || selectedAssignment.scope_code || "";
    if (selectedAssignment.scope_type === "PROGRAM") {
      return programs.filter((program) => program.code === selectedAssignment.scope_code);
    }
    if (selectedAssignment.scope_type === "COLLEGE") {
      return programs.filter((program) => program.college?.toLowerCase() === scope.toLowerCase());
    }
    return programs;
  }, [data, selectedAssignment]);

  if (loading) {
    return <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-7 w-7 animate-spin text-[#DD7230]" />
      <p className="text-sm text-gray-500">Loading your personnel workspace…</p>
    </div>;
  }

  if (error || !data) {
    return <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center text-center">
      <AlertCircle className="h-8 w-8 text-rose-500" />
      <h1 className="mt-3 text-lg font-semibold text-gray-900">Dashboard unavailable</h1>
      <p className="mt-1 text-sm text-gray-500">{error}</p>
      <button onClick={() => void loadDashboard()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#DD7230] px-4 py-2 text-sm font-semibold text-white">
        <RefreshCw className="h-4 w-4" /> Try again
      </button>
    </div>;
  }

  const stats = [
    { label: "Available documents", value: data.summary.documents, icon: BookOpen, path: "/app/knowledge-repository" },
    { label: "My AI questions", value: data.summary.queries, icon: MessageSquare, path: "/app/ask-policy" },
    { label: "Document activity", value: data.summary.access_events, icon: FileText, path: "/app/knowledge-repository" },
    { label: "Open tracked documents", value: data.summary.open_documents, icon: FileClock, path: "/app/paper-trail" },
  ];

  const showAccreditation = includesAssignment(ACADEMIC_TYPES) && Boolean(data.modules.accreditation);
  const showGovernance = includesAssignment(GOVERNANCE_TYPES) && Boolean(data.modules.governance);
  const showSurvey = includesAssignment(SURVEY_TYPES) && Boolean(data.modules.survey);
  const showDocumentControl = (!selectedAssignment || selectedAssignment.assignment_type === "DOCUMENT_CONTROLLER")
    && Boolean(data.modules.document_tracking?.controller);

  return <div className="space-y-6 pb-10">
    <PageHeader
      title={`Welcome, ${data.profile.full_name.split(" ")[0]}`}
      description="Your responsibilities, scoped records, and pending work in one place."
      actions={<span className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800">
        <Users className="h-4 w-4" /> Personnel Portal
      </span>}
    />

    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Current responsibilities</h2>
          <p className="mt-0.5 text-xs text-gray-500">Choose one assignment to focus the dashboard, or view all responsibilities together.</p>
        </div>
        {assignments.length > 1 && <button onClick={() => setSelectedKey("ALL")} className="text-xs font-medium text-[#C75F22] hover:underline">Show everything</button>}
      </div>
      {assignments.length === 0 ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Your Personnel account has no assignment yet. Contact the System Administrator to configure your office, college, or program responsibility.
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {assignments.length > 1 && <button onClick={() => setSelectedKey("ALL")} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selectedKey === "ALL" ? "border-[#DD7230] bg-[#DD7230] text-white" : "border-gray-200 bg-white text-gray-600 hover:border-orange-300"}`}>All responsibilities</button>}
          {assignments.map((assignment, index) => {
            const key = assignmentKey(assignment, index);
            return <button key={key} onClick={() => setSelectedKey(key)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selectedKey === key || (assignments.length === 1 && selectedKey === "ALL") ? "border-[#DD7230] bg-orange-50 text-[#B9531B]" : "border-gray-200 bg-white text-gray-600 hover:border-orange-300"}`}>
              {assignmentDescription(assignment)}
            </button>;
          })}
        </div>
      )}
    </section>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, path }) => <button key={label} onClick={() => navigate(path)} className="group rounded-xl border border-gray-200 bg-white p-4 text-left shadow-2xs transition hover:border-orange-300 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">{label}</span>
          <span className="rounded-lg bg-orange-50 p-2 text-[#DD7230]"><Icon className="h-4 w-4" /></span>
        </div>
        <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      </button>)}
    </section>

    {data.attention.length > 0 && <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs">
      <div className="mb-3 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-[#DD7230]" /><h2 className="text-sm font-semibold text-gray-900">Needs your attention</h2></div>
      <div className="grid gap-2 lg:grid-cols-2">
        {data.attention.map((item, index) => <button key={`${item.kind}-${index}`} disabled={!item.path} onClick={() => item.path && navigate(item.path)} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/60 p-3 text-left disabled:cursor-default">
          <div className="flex items-center gap-3">
            {item.count > 0 && <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-orange-100 px-2 text-xs font-bold text-orange-800">{item.count}</span>}
            <span className="text-sm text-gray-700">{item.message}</span>
          </div>
          {item.path && <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />}
        </button>)}
      </div>
    </section>}

    <section className="grid gap-4 lg:grid-cols-2">
      {showAccreditation && <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><ShieldCheck className="h-4 w-4 text-[#DD7230]" /> Accreditation readiness</h2><p className="mt-1 text-xs text-gray-500">Only programs covered by your academic assignment are included.</p></div>
          <button onClick={() => navigate("/app/accreditation-support")} className="text-xs font-semibold text-[#C75F22]">Open module</button>
        </div>
        {visiblePrograms.length === 0 ? <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">No program readiness data is available for this assignment.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visiblePrograms.map((program) => <div key={program.code} className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-gray-900">{program.code}</p><p className="mt-0.5 text-[11px] text-gray-500">{program.college}</p></div>{!program.unavailable && <span className="text-sm font-bold text-[#C75F22]">{program.overall || 0}%</span>}</div>
            {program.unavailable ? <p className="mt-3 text-xs text-rose-600">Readiness data is temporarily unavailable.</p> : <><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#DD7230]" style={{ width: `${program.overall || 0}%` }} /></div><div className="mt-2 flex justify-between text-[11px] text-gray-500"><span>{program.evidence || 0} evidence items</span><span>{program.gaps || 0} gaps</span></div></>}
          </div>)}
        </div>}
      </div>}

      {showGovernance && <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><ClipboardList className="h-4 w-4 text-[#DD7230]" /> Quality and governance</h2>
        {data.modules.governance?.unavailable ? <p className="mt-4 text-sm text-rose-600">Governance metrics are temporarily unavailable.</p> : <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-gray-50 p-3"><p className="text-xl font-bold text-gray-900">{data.modules.governance?.action_plans || 0}</p><p className="text-[11px] text-gray-500">Action plans</p></div><div className="rounded-lg bg-amber-50 p-3"><p className="text-xl font-bold text-amber-700">{data.modules.governance?.pending || 0}</p><p className="text-[11px] text-amber-700">Pending</p></div><div className="rounded-lg bg-rose-50 p-3"><p className="text-xl font-bold text-rose-700">{data.modules.governance?.overdue || 0}</p><p className="text-[11px] text-rose-700">Overdue</p></div></div>}
        <button onClick={() => navigate("/app/accreditation-support")} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#C75F22]">View governance work <ArrowRight className="h-3.5 w-3.5" /></button>
      </div>}

      {showSurvey && <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><BarChart3 className="h-4 w-4 text-[#DD7230]" /> Survey analytics</h2>
        {data.modules.survey?.unavailable ? <p className="mt-4 text-sm text-rose-600">Survey metrics are temporarily unavailable.</p> : <><p className="mt-4 text-3xl font-bold text-gray-900">{data.modules.survey?.responses || 0}</p><p className="text-xs text-gray-500">Responses visible in {data.modules.survey?.scope || "your assigned scope"}</p></>}
        <button onClick={() => navigate("/app/client-survey-dashboard")} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#C75F22]">Open survey analytics <ArrowRight className="h-3.5 w-3.5" /></button>
      </div>}

      {showDocumentControl && <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><FileClock className="h-4 w-4 text-[#DD7230]" /> Document control</h2>
        <div className="mt-4 flex items-end gap-6"><div><p className="text-3xl font-bold text-gray-900">{data.modules.document_tracking?.open || 0}</p><p className="text-xs text-gray-500">Open records</p></div><div><p className="text-xl font-semibold text-gray-700">{data.modules.document_tracking?.total || 0}</p><p className="text-xs text-gray-500">Total visible</p></div></div>
        <button onClick={() => navigate("/app/paper-trail")} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#C75F22]">Open document tracking <ArrowRight className="h-3.5 w-3.5" /></button>
      </div>}
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
        <h2 className="text-sm font-semibold text-gray-900">Recent document activity</h2>
        {data.partial_errors.includes("activity") ? <p className="mt-4 text-sm text-rose-600">Recent activity is temporarily unavailable.</p> : data.recent_activity.length === 0 ? <p className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">No document activity has been recorded yet.</p> : <div className="mt-3 divide-y divide-gray-100">
          {data.recent_activity.map((activity) => <div key={activity.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-gray-800">{activity.title}</p><p className="text-xs text-gray-500">{activity.action}</p></div><span className="shrink-0 text-[11px] text-gray-400">{formatActivityDate(activity.timestamp)}</span></div>)}
        </div>}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
        <h2 className="text-sm font-semibold text-gray-900">Quick actions</h2>
        <div className="mt-3 space-y-2">
          <button onClick={() => navigate("/app/ask-policy")} className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left text-sm text-gray-700 hover:border-orange-300"><span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-[#DD7230]" /> Ask the AI Assistant</span><ArrowRight className="h-4 w-4 text-gray-400" /></button>
          <button onClick={() => navigate("/app/knowledge-repository")} className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left text-sm text-gray-700 hover:border-orange-300"><span className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-[#DD7230]" /> Browse documents</span><ArrowRight className="h-4 w-4 text-gray-400" /></button>
          {permissions["governance.access"] && <button onClick={() => navigate("/app/accreditation-support")} className="flex w-full items-center justify-between rounded-lg border border-gray-200 p-3 text-left text-sm text-gray-700 hover:border-orange-300"><span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#DD7230]" /> Open assigned QA work</span><ArrowRight className="h-4 w-4 text-gray-400" /></button>}
        </div>
      </div>
    </section>
  </div>;
}
