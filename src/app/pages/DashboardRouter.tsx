import { useRole } from "../contexts/RoleContext";
import { AdminDashboard } from "./AdminDashboard";
import { FacultyDashboard } from "./FacultyDashboard";
import { StudentDashboard } from "./StudentDashboard";

export function DashboardRouter() {
  // FIXED: We extract 'userRole' instead of 'user'
  const { userRole } = useRole();

  // FIXED: We check 'userRole' directly instead of 'user.role'
  switch (userRole) {
    case "SYSTEM_ADMIN":
      return <AdminDashboard />;
    case "OFFICE_HEAD":
    case "COLLEGE_DEAN":
    case "PROGRAM_CHAIR":
    case "COLLEGE_SECRETARY":
    case "ADMIN":
    case "FACULTY":
      return <FacultyDashboard />;
    case "DOCUMENT_CONTROLLER":
      return <FacultyDashboard />;
    case "STUDENT":
      return <StudentDashboard />;
    default:
      // Fallback just in case
      return <StudentDashboard />; 
  }
}
