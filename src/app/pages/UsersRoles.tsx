import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle, Loader2, Pencil, Plus, Search, Trash2, UserPlus, X } from "lucide-react";
import apiClient from "../api/client";
import {
  ASSIGNMENT_SCOPE, CAMPUS_COLLEGES, CAMPUS_PROGRAMS, PERSONNEL_ASSIGNMENT_TYPES,
  assignmentLabel, roleLabel,
} from "../constants/academicScopes";

export { CAMPUS_COLLEGES, CAMPUS_PROGRAMS } from "../constants/academicScopes";

// These are ISO/QMS process groups, not the campus organizational office directory.
export const ISO_OFFICES_16 = [
  "Campus Director", "Academic Affairs", "Student Affairs & Services", "Administrative & Finance",
  "Research & Development", "Extension & Community Services", "Production & Resource Generation",
  "Quality Assurance & Management (QAU)", "Registrar's Office", "Guidance & Placement",
  "University Library", "Medical & Dental Clinic", "Supply & Property Unit", "HR & Records Management",
  "MIS & Information Technology Unit", "Security & Physical Plant Unit",
];

type Scope = { id: string; code: string; name: string; college_unit_id?: string };
type Assignment = {
  id?: string; assignment_type: string; scope_type: string; scope_id: string | null;
  scope_code?: string; scope_name?: string; is_primary: boolean;
};
type ReferenceData = { offices: Scope[]; colleges: Scope[]; programs: Scope[]; assignment_types: string[] };

const emptyReferences: ReferenceData = { offices: [], colleges: [], programs: [], assignment_types: [] };
const emptyForm = { full_name: "", email: "", role: "PERSONNEL", password: "", assignments: [] as Assignment[] };

function defaultAssignment(type: string, refs: ReferenceData): Assignment {
  const scopeType = ASSIGNMENT_SCOPE[type] || "CAMPUS";
  const choices = scopeType === "OFFICE" ? refs.offices : scopeType === "COLLEGE" ? refs.colleges : scopeType === "PROGRAM" ? refs.programs : [];
  return { assignment_type: type, scope_type: scopeType, scope_id: choices[0]?.id || null, is_primary: false };
}

function scopeChoices(scopeType: string, refs: ReferenceData) {
  if (scopeType === "OFFICE") return refs.offices;
  if (scopeType === "COLLEGE") return refs.colleges;
  if (scopeType === "PROGRAM") return refs.programs;
  return [];
}

function AssignmentEditor({ value, onChange, refs }: { value: Assignment[]; onChange: (value: Assignment[]) => void; refs: ReferenceData }) {
  const add = () => onChange([...value, defaultAssignment("FACULTY_MEMBER", refs)]);
  const update = (index: number, patch: Partial<Assignment>) => onChange(value.map((item, i) => i === index ? { ...item, ...patch } : item));
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-800">Personnel assignments</p>
          <p className="text-[11px] text-gray-500">Add every position this person currently holds.</p>
        </div>
        <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
          <Plus className="h-3.5 w-3.5" /> Add assignment
        </button>
      </div>
      {value.length === 0 && <div className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-center text-xs text-gray-500">No assignment added yet.</div>}
      {value.map((assignment, index) => {
        const flexibleScope = ["IQA_AUDITOR", "SURVEY_ANALYST"].includes(assignment.assignment_type);
        const choices = scopeChoices(assignment.scope_type, refs);
        return (
          <div key={`${assignment.assignment_type}-${index}`} className={`grid gap-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3 ${flexibleScope ? "sm:grid-cols-[1.2fr_.8fr_1.35fr_auto]" : "sm:grid-cols-[1.2fr_1.5fr_auto]"}`}>
            <select value={assignment.assignment_type} onChange={(event) => {
              const next = defaultAssignment(event.target.value, refs);
              update(index, { ...next, is_primary: assignment.is_primary });
            }} className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs">
              {PERSONNEL_ASSIGNMENT_TYPES.map((type) => <option key={type} value={type}>{assignmentLabel(type)}</option>)}
            </select>
            {flexibleScope && <select value={assignment.scope_type} onChange={(event) => {
              const scopeType = event.target.value;
              const first = scopeChoices(scopeType, refs)[0];
              update(index, { scope_type: scopeType, scope_id: scopeType === "CAMPUS" ? null : first?.id || null });
            }} className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs">
              <option value="CAMPUS">Campus-wide</option><option value="OFFICE">Specific office</option>
            </select>}
            {assignment.scope_type === "CAMPUS" ? (
              <div className="flex h-9 items-center rounded-lg border border-gray-200 bg-gray-100 px-3 text-xs text-gray-600">CTU Argao Campus</div>
            ) : (
              <select value={assignment.scope_id || ""} onChange={(event) => update(index, { scope_id: event.target.value })} className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-xs">
                <option value="" disabled>Select {assignment.scope_type.toLowerCase()}</option>
                {choices.map((scope) => <option key={scope.id} value={scope.id}>{scope.name}</option>)}
              </select>
            )}
            <div className="flex items-center justify-end gap-2">
              <label className="flex items-center gap-1 text-[11px] text-gray-600"><input type="radio" name="primary-assignment" checked={assignment.is_primary} onChange={() => onChange(value.map((item, i) => ({ ...item, is_primary: i === index })))} /> Primary</label>
              <button type="button" onClick={() => remove(index)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove assignment"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function UsersRoles() {
  const [users, setUsers] = useState<any[]>([]);
  const [refs, setRefs] = useState<ReferenceData>(emptyReferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  const notify = (message: string, error = false) => { setToast({ message, error }); window.setTimeout(() => setToast(null), 3200); };
  const load = async () => {
    setLoading(true);
    try {
      const [usersResponse, referenceResponse] = await Promise.all([
        apiClient.get("/users"), apiClient.get("/authorization/reference-data"),
      ]);
      setUsers(usersResponse.data || []);
      setRefs(referenceResponse.data || emptyReferences);
    } catch { notify("Unable to load users and authorization data.", true); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => users.filter((user) => {
    const search = query.trim().toLowerCase();
    return (roleFilter === "ALL" || user.role === roleFilter)
      && (!search || `${user.full_name} ${user.email} ${user.role} ${(user.assignments || []).map((a: Assignment) => `${a.assignment_type} ${a.scope_name}`).join(" ")}`.toLowerCase().includes(search));
  }), [users, query, roleFilter]);

  const openCreate = () => { setEditingId(null); setForm({ ...emptyForm, assignments: [] }); setModal("create"); };
  const openEdit = (user: any) => {
    setEditingId(user.id);
    setForm({ full_name: user.full_name || "", email: user.email, role: user.role, password: "", assignments: (user.assignments || []).map((a: Assignment) => ({ ...a })) });
    setModal("edit");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || (modal === "create" && form.password.length < 8)) {
      notify("Complete the required fields. New passwords must contain at least 8 characters.", true); return;
    }
    if (form.role === "PERSONNEL" && form.assignments.some((a) => a.scope_type !== "CAMPUS" && !a.scope_id)) {
      notify("Select a scope for every personnel assignment.", true); return;
    }
    setSaving(true);
    const payload: any = { full_name: form.full_name.trim(), email: form.email.trim(), role: form.role, assignments: form.role === "PERSONNEL" ? form.assignments.map(({ assignment_type, scope_type, scope_id, is_primary }) => ({ assignment_type, scope_type, scope_id, is_primary })) : [] };
    if (modal === "create") payload.password = form.password;
    try {
      if (modal === "create") await apiClient.post("/users", payload);
      else await apiClient.put(`/users/${editingId}/details`, payload);
      setModal(null); await load(); notify(modal === "create" ? "Account created." : "User and assignments updated.");
    } catch (error: any) { notify(error?.response?.data?.detail || "Unable to save the account.", true); }
    finally { setSaving(false); }
  };

  const toggleStatus = async (user: any) => {
    try { await apiClient.put(`/users/${user.id}/${user.status === "Disabled" ? "enable" : "disable"}`); await load(); notify(`Account ${user.status === "Disabled" ? "enabled" : "disabled"}.`); }
    catch (error: any) { notify(error?.response?.data?.detail || "Unable to update account status.", true); }
  };

  return (
    <div className="space-y-5">
      {toast && <div className={`fixed right-5 top-5 z-[100] rounded-lg border px-4 py-3 text-sm shadow-lg ${toast.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{toast.message}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Users & Roles</h1><p className="mt-1 text-sm text-gray-500">Manage base roles and multiple scoped personnel assignments.</p></div>
        <button onClick={openCreate} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#DD7230] px-4 text-sm font-semibold text-white hover:bg-[#c9662b]"><UserPlus className="h-4 w-4" /> Add user</button>
      </div>
      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-[1fr_210px]">
        <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users, assignments, or scopes" className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-[#DD7230]" /></div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-10 rounded-lg border border-gray-200 px-3 text-sm"><option value="ALL">All base roles</option><option value="SYSTEM_ADMIN">System Administrator</option><option value="PERSONNEL">Personnel</option><option value="STUDENT">Student</option></select>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto"><table className="min-w-full"><thead className="border-b border-gray-200 bg-gray-50"><tr>{["User", "Base role", "Assignments", "Status", "Actions"].map((label) => <th key={label} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={5} className="py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[#DD7230]" /></td></tr> : filtered.length === 0 ? <tr><td colSpan={5} className="py-14 text-center text-sm text-gray-500">No users found.</td></tr> : filtered.map((user) => <tr key={user.id} className="align-top hover:bg-gray-50/60">
            <td className="px-4 py-3"><p className="text-sm font-semibold text-gray-900">{user.full_name || "Unnamed user"}</p><p className="text-xs text-gray-500">{user.email}</p></td>
            <td className="px-4 py-3"><span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">{roleLabel(user.role)}</span></td>
            <td className="max-w-xl px-4 py-3"><div className="flex flex-wrap gap-1.5">{(user.assignments || []).length ? user.assignments.map((a: Assignment) => <span key={a.id || `${a.assignment_type}-${a.scope_id}`} className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] text-orange-800">{assignmentLabel(a.assignment_type)}{a.scope_name ? ` · ${a.scope_name}` : ""}</span>) : <span className="text-xs text-gray-400">No scoped assignment</span>}</div></td>
            <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${user.status === "Disabled" ? "bg-red-50 text-red-700" : user.is_verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{user.status === "Disabled" ? <Ban className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}{user.status === "Disabled" ? "Disabled" : user.is_verified ? "Active" : "Pending"}</span></td>
            <td className="px-4 py-3"><div className="flex items-center gap-1"><button onClick={() => openEdit(user)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800" title="Edit"><Pencil className="h-4 w-4" /></button><button onClick={() => toggleStatus(user)} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800" title={user.status === "Disabled" ? "Enable" : "Disable"}>{user.status === "Disabled" ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}</button>{!user.is_verified && <button onClick={async () => { await apiClient.put(`/users/${user.id}/verify`); await load(); notify("Account verified."); }} className="rounded-md px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">Verify</button>}</div></td>
          </tr>)}</tbody></table></div>
      </div>

      {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"><div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><div><h2 className="text-base font-semibold text-gray-900">{modal === "create" ? "Add user" : "Edit user"}</h2><p className="text-xs text-gray-500">Choose one base role and any applicable personnel assignments.</p></div><button onClick={() => setModal(null)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button></div>
        <form onSubmit={submit} className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-gray-700">Full name<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" /></label><label className="text-xs font-medium text-gray-700">Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" /></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-gray-700">Base role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"><option value="SYSTEM_ADMIN">System Administrator</option><option value="PERSONNEL">Personnel</option><option value="STUDENT">Student</option></select></label>{modal === "create" && <label className="text-xs font-medium text-gray-700">Temporary password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm" /></label>}</div>
          {form.role === "PERSONNEL" && <AssignmentEditor value={form.assignments} onChange={(assignments) => setForm({ ...form, assignments })} refs={refs} />}
          <div className="flex justify-end gap-2 border-t border-gray-200 pt-4"><button type="button" onClick={() => setModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#DD7230] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{modal === "create" ? "Create account" : "Save changes"}</button></div>
        </form>
      </div></div>}
    </div>
  );
}
