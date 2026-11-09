import { useRole } from "../contexts/RoleContext";
import { AdminDashboard } from "./AdminDashboard";
import { PersonnelDashboard } from "./PersonnelDashboard";
import { StudentDashboard } from "./StudentDashboard";

export function DashboardRouter() {
  // FIXED: We extract 'userRole' instead of 'user'
  const { userRole } = useRole();

  // FIXED: We check 'userRole' directly instead of 'user.role'
  switch (userRole) {
    case "SYSTEM_ADMIN":
      return <AdminDashboard />;
    case "PERSONNEL":
      return <PersonnelDashboard />;
    case "STUDENT":
      return <StudentDashboard />;
    default:
      // Fallback just in case
      return <StudentDashboard />; 
  }
}
