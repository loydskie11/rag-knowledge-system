import type { UserRole } from "../contexts/RoleContext";

export type PermissionKey =
  | "canAccessDashboard" | "canAccessKnowledgeRepository" | "canAccessAskPolicy"
  | "canAccessAccreditationSupport" | "canAccessAuditTrail"
  | "canAccessUsersRoles" | "canAccessSettings" | "canAccessBroadcastAnnouncement"
  | "canAccessDocumentGenerator" | "canAccessPaperTrail" | "canAccessGradeEvaluation"
  | "canAccessClientSurvey" | "canAccessServiceSatisfaction" | "canUploadDocuments"
  | "canDeleteDocuments" | "canEditDocuments" | "canManageUsers" | "canViewAnalytics";

export type BackendCapability =
  | "system.manage" | "users.manage" | "audit.view" | "settings.manage"
  | "broadcast.manage" | "governance.access" | "governance.review"
  | "governance.manage" | "governance.cross_office" | "documents.manage"
  | "paper_trail.read" | "paper_trail.control" | "survey.analytics"
  | "survey.cross_office";

const studentPermissions: Record<PermissionKey, boolean> = {
  canAccessDashboard: true, canAccessKnowledgeRepository: true, canAccessAskPolicy: true,
  canAccessAccreditationSupport: false,
  canAccessAuditTrail: false, canAccessUsersRoles: false, canAccessSettings: false,
  canAccessBroadcastAnnouncement: false, canAccessDocumentGenerator: false,
  canAccessPaperTrail: false, canAccessGradeEvaluation: true, canAccessClientSurvey: true,
  canAccessServiceSatisfaction: false, canUploadDocuments: false, canDeleteDocuments: false,
  canEditDocuments: false, canManageUsers: false, canViewAnalytics: false,
};

const personnelPermissions: Record<PermissionKey, boolean> = {
  ...studentPermissions,
  canAccessDocumentGenerator: true,
  canAccessPaperTrail: true, canAccessGradeEvaluation: true,
};

const adminPermissions = Object.fromEntries(
  Object.keys(studentPermissions).map((key) => [key, true]),
) as Record<PermissionKey, boolean>;

export const rolePermissions: Record<UserRole, Record<PermissionKey, boolean>> = {
  SYSTEM_ADMIN: adminPermissions,
  PERSONNEL: personnelPermissions,
  STUDENT: studentPermissions,
};

export function hasCapability(permission: BackendCapability): boolean {
  try { return JSON.parse(sessionStorage.getItem("effectivePermissions") || "{}")[permission] === true; }
  catch { return false; }
}

const capabilityPermissionMap: Partial<Record<PermissionKey, BackendCapability>> = {
  canAccessAccreditationSupport: "governance.access",
  canAccessAuditTrail: "audit.view",
  canAccessUsersRoles: "users.manage",
  canAccessSettings: "settings.manage",
  canAccessBroadcastAnnouncement: "broadcast.manage",
  canAccessPaperTrail: "paper_trail.read",
  canAccessServiceSatisfaction: "survey.analytics",
  canUploadDocuments: "documents.manage",
  canDeleteDocuments: "documents.manage",
  canEditDocuments: "documents.manage",
  canManageUsers: "users.manage",
  canViewAnalytics: "survey.analytics",
};

export function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  const capability = capabilityPermissionMap[permission];
  if (capability) return hasCapability(capability);
  return rolePermissions[role]?.[permission] === true;
}

export function getAccessibleRoutes(role: UserRole) {
  const routePermissions: Array<[PermissionKey, string]> = [
    ["canAccessDashboard", "/app"], ["canAccessKnowledgeRepository", "/app/knowledge-repository"],
    ["canAccessAskPolicy", "/app/ask-policy"], ["canAccessAccreditationSupport", "/app/accreditation-support"],
    ["canAccessAuditTrail", "/app/audit-trail"],
    ["canAccessUsersRoles", "/app/users-roles"], ["canAccessSettings", "/app/settings"],
    ["canAccessBroadcastAnnouncement", "/app/broadcast-announcement"],
    ["canAccessDocumentGenerator", "/app/document-generator"], ["canAccessPaperTrail", "/app/paper-trail"],
    ["canAccessGradeEvaluation", "/app/grade-evaluation"], ["canAccessClientSurvey", "/app/client-survey"],
    ["canAccessServiceSatisfaction", "/app/client-survey-dashboard"],
  ];
  return routePermissions.filter(([permission]) => hasPermission(role, permission)).map(([, route]) => route);
}
