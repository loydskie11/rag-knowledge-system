import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../api/client';
import type { BackendCapability } from '../utils/rolePermissions';

export type UserRole = 'STUDENT' | 'PERSONNEL' | 'SYSTEM_ADMIN';
export interface PersonnelAssignment {
  id?: string;
  assignment_type: string;
  scope_type: string;
  scope_id?: string | null;
  scope_code?: string | null;
  scope_name?: string | null;
  is_primary?: boolean;
}

export interface AuthProfile {
  id: string;
  role: UserRole;
  email: string;
  full_name?: string;
  assignments: PersonnelAssignment[];
  permissions: Partial<Record<BackendCapability, boolean>>;
  allowed_programs?: string[];
  allowed_iso_processes?: string[];
}
export interface ReferenceItem { id: string; code: string; name: string; college_unit_id?: string; college_name?: string }
export interface ReferenceData {
  offices: ReferenceItem[];
  colleges: ReferenceItem[];
  programs: ReferenceItem[];
  iso_process_groups: ReferenceItem[];
}
const emptyReferenceData: ReferenceData = { offices: [], colleges: [], programs: [], iso_process_groups: [] };

interface RoleContextType {
  userRole: UserRole | null;
  setUserRole: (role: UserRole) => Promise<boolean>;
  permissionsReady: boolean;
  accessScope: string;
  permissions: Partial<Record<BackendCapability, boolean>>;
  profile: AuthProfile | null;
  assignments: PersonnelAssignment[];
  referenceData: ReferenceData;
  refreshReferenceData: () => Promise<void>;
}
const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [userRole, setRole] = useState<UserRole | null>(null);
  const [permissionsReady, setReady] = useState(false);
  const [accessScope, setAccessScope] = useState("");
  const refreshId = useRef(0);
  const [permissions, setPermissions] = useState<Partial<Record<BackendCapability, boolean>>>({});
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData>(emptyReferenceData);
  const refreshReferenceData = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/public/reference-data');
      setReferenceData({ ...emptyReferenceData, ...data });
    } catch {
      setReferenceData(emptyReferenceData);
    }
  }, []);
  const refresh = useCallback(async () => {
    const id = ++refreshId.current;
    try {
      const { data } = await apiClient.get('/auth/me');
      if (id !== refreshId.current) return;
      setAccessScope(JSON.stringify(data));
      sessionStorage.setItem('userRole', data.role);
      sessionStorage.setItem('userEmail', data.email);
      sessionStorage.setItem('userName', data.full_name || 'CTU User');
      sessionStorage.setItem('userAdministrativeOffice', data.administrative_office || '');
      sessionStorage.setItem('userDepartment', data.department || '');
      sessionStorage.setItem('isIqaAuditor', String(data.is_iqa_auditor));
      sessionStorage.setItem('allowedPrograms', JSON.stringify(data.allowed_programs || []));
      sessionStorage.setItem('allowedIsoProcesses', JSON.stringify(data.allowed_iso_processes || []));
      sessionStorage.setItem('userAssignments', JSON.stringify(data.assignments || []));
      sessionStorage.setItem('createdByAdmin', String(data.created_by_admin || false));
      sessionStorage.setItem('emailChanged', String(data.email_changed || false));
      sessionStorage.setItem('effectivePermissions', JSON.stringify(data.permissions));
      window.dispatchEvent(new CustomEvent('auth-profile-updated', { detail: data }));
      setPermissions(data.permissions);
      setRole(data.role);
      setProfile(data);
      return true;
    } catch {
      if (id !== refreshId.current) return;
      setAccessScope("");
      sessionStorage.removeItem('effectivePermissions');
      setPermissions({});
      setRole(null);
      setProfile(null);
      return false;
    } finally { if (id === refreshId.current) setReady(true); }
  }, []);
  useEffect(() => {
    void refresh();
    void refreshReferenceData();
    const onFocus = () => { void refresh(); };
    const onReferencesChanged = () => { void refreshReferenceData(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('reference-data-updated', onReferencesChanged);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('reference-data-updated', onReferencesChanged);
    };
  }, [refresh, refreshReferenceData]);
  const setUserRole = async (_role: UserRole) => {
    setReady(false);
    return (await refresh()) === true;
  };
  return <RoleContext.Provider value={{
    userRole,
    setUserRole,
    permissionsReady,
    permissions,
    accessScope,
    profile,
    assignments: profile?.assignments || [],
    referenceData,
    refreshReferenceData,
  }}>{children}</RoleContext.Provider>;
}
export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
}
