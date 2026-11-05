import { Fragment } from "react"
import { Navigate } from "react-router"
import { useRole } from "../contexts/RoleContext"
import { hasPermission } from "../utils/rolePermissions"

interface ProtectedRouteProps {
  children: React.ReactNode
  permission?: string // <-- The '?' makes this prop optional!
}

export function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { userRole, permissionsReady, accessScope } = useRole()
  if (!permissionsReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]" role="status" aria-label="Loading">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#DD7230]" aria-hidden="true" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }
  if (!userRole) return <Navigate to="/login" replace />

  const currentRole = userRole || "STUDENT"

  // Only check permissions if a specific permission was actually requested
  if (permission && !hasPermission(currentRole, permission as any)) {
    return <Navigate to="/app" replace />
  }

  return <Fragment key={accessScope}>{children}</Fragment>
}
