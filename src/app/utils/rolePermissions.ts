import type { UserRole } from "../contexts/RoleContext";

const basePermissions = {
  SYSTEM_ADMIN: {
    canAccessDashboard: true,
    canAccessKnowledgeRepository: true,
    canAccessAskPolicy: true,
    canAccessAccreditationSupport: true,
    canAccessGovernanceReference: true,
    canAccessAuditTrail: true,
    canAccessUsersRoles: true,
    canAccessSettings: true,
    canAccessBroadcastAnnouncement: true,
    canAccessDocumentGenerator: true,
    canAccessPaperTrail: true,
    canAccessGradeEvaluation: true,
    canAccessClientSurvey: true,
    canAccessServiceSatisfaction: true,
    canUploadDocuments: true,
    canDeleteDocuments: true,
    canEditDocuments: true,
    canManageUsers: true,
    canViewAnalytics: true,
  },
  FACULTY: {
    canAccessDashboard: true,
    canAccessKnowledgeRepository: true,
    canAccessAskPolicy: true,
    canAccessAccreditationSupport: true,
    canAccessGovernanceReference: true,
    canAccessAuditTrail: false,
    canAccessUsersRoles: false,
    canAccessSettings: false,
    canAccessBroadcastAnnouncement: false,
    canAccessDocumentGenerator: true,
    canAccessPaperTrail: true,
    canAccessGradeEvaluation: true,
    canAccessClientSurvey: true,
    canAccessServiceSatisfaction: true,
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canEditDocuments: false,
    canManageUsers: false,
    canViewAnalytics: true,
  },
  DOCUMENT_CONTROLLER: {
    canAccessDashboard: true,
    canAccessKnowledgeRepository: true,
    canAccessAskPolicy: true,
    canAccessAccreditationSupport: false,
    canAccessGovernanceReference: true,
    canAccessAuditTrail: false,
    canAccessUsersRoles: false,
    canAccessSettings: false,
    canAccessBroadcastAnnouncement: false,
    canAccessDocumentGenerator: true,
    canAccessPaperTrail: true,
    canAccessGradeEvaluation: false,
    canAccessClientSurvey: false,
    canAccessServiceSatisfaction: false,
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canEditDocuments: false,
    canManageUsers: false,
    canViewAnalytics: false,
  },
  STUDENT: {
    canAccessDashboard: true,
    canAccessKnowledgeRepository: true,
    canAccessAskPolicy: true,
    canAccessAccreditationSupport: false,
    canAccessGovernanceReference: false,
    canAccessAuditTrail: false,
    canAccessUsersRoles: false,
    canAccessSettings: false,
    canAccessBroadcastAnnouncement: false,
    canAccessDocumentGenerator: false,
    canAccessPaperTrail: false,
    canAccessGradeEvaluation: true,
    canAccessClientSurvey: true,
    canAccessServiceSatisfaction: false,
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canEditDocuments: false,
    canManageUsers: false,
    canViewAnalytics: false,
  },
};

export const rolePermissions = {
  ...basePermissions,
  OFFICE_HEAD: {
    ...basePermissions.FACULTY,
    canUploadDocuments: true, canEditDocuments: true, canDeleteDocuments: true,
  },
  COLLEGE_DEAN: {
    ...basePermissions.FACULTY,
    canUploadDocuments: true, canEditDocuments: true, canDeleteDocuments: true,
  },
  PROGRAM_CHAIR: {
    ...basePermissions.FACULTY,
    canUploadDocuments: true, canEditDocuments: true, canDeleteDocuments: true,
  },
  COLLEGE_SECRETARY: {
    ...basePermissions.FACULTY,
    canUploadDocuments: true, canEditDocuments: true, canDeleteDocuments: true,
    canAccessGradeEvaluation: false,
  },
  // Compatibility for a stale browser session; never grant legacy ADMIN system access.
  ADMIN: { ...basePermissions.FACULTY, canUploadDocuments: true, canEditDocuments: true, canDeleteDocuments: true },
};

export function hasCapability(permission: string): boolean {
  try { return JSON.parse(sessionStorage.getItem("effectivePermissions") || "{}")[permission] === true; }
  catch { return false; }
}

export function hasPermission(role: UserRole, permission: keyof typeof rolePermissions.SYSTEM_ADMIN): boolean {
  return rolePermissions[role]?.[permission] === true;
}

export function getAccessibleRoutes(role: UserRole) {
  const permissions = rolePermissions[role] || rolePermissions.STUDENT;
  const routes = [];

  if (permissions.canAccessDashboard) routes.push("/app");
  if (permissions.canAccessKnowledgeRepository) routes.push("/app/knowledge-repository");
  if (permissions.canAccessAskPolicy) routes.push("/app/ask-policy");
  if (permissions.canAccessAccreditationSupport) routes.push("/app/accreditation-support");
  if (permissions.canAccessGovernanceReference) routes.push("/app/governance-reference");
  if (permissions.canAccessAuditTrail) routes.push("/app/audit-trail");
  if (permissions.canAccessUsersRoles) routes.push("/app/users-roles");
  if (permissions.canAccessSettings) routes.push("/app/settings");
  if (permissions.canAccessBroadcastAnnouncement) routes.push("/app/broadcast-announcement");
  if (permissions.canAccessDocumentGenerator) routes.push("/app/document-generator");
  if (permissions.canAccessPaperTrail) routes.push("/app/paper-trail");
  if (permissions.canAccessGradeEvaluation) routes.push("/app/grade-evaluation");
  if (permissions.canAccessClientSurvey) routes.push("/app/client-survey");
  if (permissions.canAccessServiceSatisfaction) routes.push("/app/client-survey-dashboard");

  return routes;
}

