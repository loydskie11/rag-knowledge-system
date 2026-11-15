import { Fragment } from "react"
import { Navigate } from "react-router"
import { useRole } from "../contexts/RoleContext"
import type { UserRole } from "../contexts/RoleContext"
import { hasPermission } from "../utils/rolePermissions"
import type { PermissionKey } from "../utils/rolePermissions"
import { ModuleSkeleton } from "./loading/SkeletonLayouts"

interface ProtectedRouteProps {
  children: React.ReactNode
  permission?: PermissionKey
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, permission, allowedRoles }: ProtectedRouteProps) {
  const { userRole, permissionsReady, accessScope } = useRole()
  if (!permissionsReady) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] p-6 sm:p-10" role="status">
        <ModuleSkeleton />
      </div>
    )
  }
  if (!userRole) return <Navigate to="/login" replace />

  const currentRole = userRole || "STUDENT"

  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    return <Navigate to="/app/document-composer" replace />
  }

  // Only check permissions if a specific permission was actually requested
  if (permission && !hasPermission(currentRole, permission)) {
    return <Navigate to="/app" replace />
  }

  return <Fragment key={accessScope}>{children}</Fragment>
}
