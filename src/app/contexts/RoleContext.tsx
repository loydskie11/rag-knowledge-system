import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../api/client';

export type UserRole = 'STUDENT' | 'FACULTY' | 'ADMIN' | 'SYSTEM_ADMIN' | 'OFFICE_HEAD' | 'COLLEGE_DEAN' | 'PROGRAM_CHAIR' | 'COLLEGE_SECRETARY' | 'DOCUMENT_CONTROLLER';
interface RoleContextType {
  userRole: UserRole | null;
  setUserRole: (role: UserRole) => Promise<boolean>;
  permissionsReady: boolean;
  accessScope: string;
  permissions: Record<string, boolean>;
}
const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [userRole, setRole] = useState<UserRole | null>(null);
  const [permissionsReady, setReady] = useState(false);
  const [accessScope, setAccessScope] = useState("");
  const refreshId = useRef(0);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const refresh = useCallback(async () => {
    const id = ++refreshId.current;
    try {
      const { data } = await apiClient.get('/auth/me');
      if (id !== refreshId.current) return;
      setAccessScope(JSON.stringify(data));
      sessionStorage.setItem('userRole', data.role);
      sessionStorage.setItem('userEmail', data.email);
      sessionStorage.setItem('userAdministrativeOffice', data.administrative_office || '');
      sessionStorage.setItem('userDepartment', data.department || '');
      sessionStorage.setItem('isIqaAuditor', String(data.is_iqa_auditor));
      sessionStorage.setItem('allowedPrograms', JSON.stringify(data.allowed_programs || []));
      sessionStorage.setItem('effectivePermissions', JSON.stringify(data.permissions));
      setPermissions(data.permissions);
      setRole(data.role);
      return true;
    } catch {
      if (id !== refreshId.current) return;
      setAccessScope("");
      sessionStorage.removeItem('effectivePermissions');
      setPermissions({});
      setRole(null);
      return false;
    } finally { if (id === refreshId.current) setReady(true); }
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);
  const setUserRole = async (_role: UserRole) => {
    setReady(false);
    return (await refresh()) === true;
  };
  return <RoleContext.Provider value={{ userRole, setUserRole, permissionsReady, permissions, accessScope }}>{children}</RoleContext.Provider>;
}
export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
}
