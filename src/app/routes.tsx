import React, { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleProvider } from "./contexts/RoleContext";
import { PageLoader } from "./components/PageLoader";

// Lazy-loaded layouts & pages for code-splitting and performance
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout").then(m => ({ default: m.DashboardLayout })));
const LandingPage = lazy(() => import("./pages/LandingPage").then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then(m => ({ default: m.LoginPage })));
const SignUpPage = lazy(() => import("./pages/SignUpPage").then(m => ({ default: m.SignUpPage })));
const DashboardRouter = lazy(() => import("./pages/DashboardRouter").then(m => ({ default: m.DashboardRouter })));
const KnowledgeRepository = lazy(() => import("./pages/KnowledgeRepository").then(m => ({ default: m.KnowledgeRepository })));
const PaperTrail = lazy(() => import("./pages/PaperTrail").then(m => ({ default: m.PaperTrail })));
const AskPolicy = lazy(() => import("./pages/AskPolicy").then(m => ({ default: m.AskPolicy })));
const AccreditationSupport = lazy(() => import("./pages/AccreditationSupport").then(m => ({ default: m.AccreditationSupport })));
const GovernanceReference = lazy(() => import("./pages/GovernanceReference").then(m => ({ default: m.GovernanceReference })));
const AuditTrail = lazy(() => import("./pages/AuditTrail").then(m => ({ default: m.AuditTrail })));
const UsersRoles = lazy(() => import("./pages/UsersRoles").then(m => ({ default: m.UsersRoles })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings").then(m => ({ default: m.ProfileSettings })));
const BroadcastAnnouncement = lazy(() => import("./pages/BroadcastAnnouncement").then(m => ({ default: m.BroadcastAnnouncement })));
const DocumentGenerator = lazy(() => import("./pages/DocumentGenerator").then(m => ({ default: m.DocumentGenerator })));
const AIDocumentGenerator = lazy(() => import("./pages/AIDocumentGenerator").then(m => ({ default: m.AIDocumentGenerator })));
const GradeEvaluation = lazy(() => import("./pages/GradeEvaluation").then(m => ({ default: m.GradeEvaluation })));
const StudentRecords = lazy(() => import("./pages/StudentRecords").then(m => ({ default: m.StudentRecords })));
const ClientSatisfactionSurvey = lazy(() => import("./pages/ClientSatisfactionSurvey").then(m => ({ default: m.ClientSatisfactionSurvey })));

// Helper to wrap components in Suspense
const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

// Root layout that wraps everything in RoleProvider
function RootLayout() {
  return (
    <RoleProvider>
      <Outlet />
    </RoleProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: withSuspense(LandingPage),
      },
      {
        path: "/login",
        element: withSuspense(LoginPage),
      },
      {
        path: "/signup",
        element: withSuspense(SignUpPage),
      },
      {
        path: "/app",
        element: withSuspense(DashboardLayout),
        children: [
          { index: true, element: withSuspense(DashboardRouter) },
          {
            path: "knowledge-repository",
            element: (
              <ProtectedRoute permission="canAccessKnowledgeRepository">
                {withSuspense(KnowledgeRepository)}
              </ProtectedRoute>
            ),
          },
          {
            path: "paper-trail",
            element: (
              <ProtectedRoute permission="canAccessPaperTrail">
                {withSuspense(PaperTrail)}
              </ProtectedRoute>
            ),
          },
          {
            path: "ask-policy",
            element: (
              <ProtectedRoute permission="canAccessAskPolicy">
                {withSuspense(AskPolicy)}
              </ProtectedRoute>
            ),
          },
          {
            path: "accreditation-support",
            element: (
              <ProtectedRoute permission="canAccessAccreditationSupport">
                {withSuspense(AccreditationSupport)}
              </ProtectedRoute>
            ),
          },
          {
            path: "governance-reference",
            element: (
              <ProtectedRoute permission="canAccessGovernanceReference">
                {withSuspense(GovernanceReference)}
              </ProtectedRoute>
            ),
          },
          {
            path: "audit-trail",
            element: (
              <ProtectedRoute permission="canAccessAuditTrail">
                {withSuspense(AuditTrail)}
              </ProtectedRoute>
            ),
          },
          {
            path: "users-roles",
            element: (
              <ProtectedRoute permission="canAccessUsersRoles">
                {withSuspense(UsersRoles)}
              </ProtectedRoute>
            ),
          },
          {
            path: "settings",
            element: (
              <ProtectedRoute permission="canAccessSettings">
                {withSuspense(Settings)}
              </ProtectedRoute>
            ),
          },
          {
            path: "profile-settings",
            element: (
              <ProtectedRoute>
                {withSuspense(ProfileSettings)}
              </ProtectedRoute>
            ),
          },
          {
            path: "broadcast-announcement",
            element: (
              <ProtectedRoute permission="canAccessBroadcastAnnouncement">
                {withSuspense(BroadcastAnnouncement)}
              </ProtectedRoute>
            ),
          },
          {
            path: "document-generator",
            element: (
              <ProtectedRoute permission="canAccessDocumentGenerator">
                {withSuspense(DocumentGenerator)}
              </ProtectedRoute>
            ),
          },
          {
            path: "ai-document-generator",
            element: (
              <ProtectedRoute permission="canAccessAIDocumentGenerator">
                {withSuspense(AIDocumentGenerator)}
              </ProtectedRoute>
            ),
          },
          {
            path: "grade-evaluation",
            element: (
              <ProtectedRoute permission="canAccessGradeEvaluation">
                {withSuspense(GradeEvaluation)}
              </ProtectedRoute>
            ),
          },
          {
            path: "student-records",
            element: (
              <ProtectedRoute permission="canAccessStudentRecords">
                {withSuspense(StudentRecords)}
              </ProtectedRoute>
            ),
          },
          {
            path: "client-survey",
            element: (
              <ProtectedRoute permission="canAccessClientSurvey">
                {withSuspense(ClientSatisfactionSurvey)}
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
]);