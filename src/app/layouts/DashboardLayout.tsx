import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Database, MessageSquare, Award, FileText,
  Clock, Users, Settings, Search, Bell, ChevronLeft, ChevronRight,
  GraduationCap, LogOut, Shield, BookOpen, Radio, ClipboardCheck, Sparkles, X, FileCheck, Menu,
  HeartHandshake, ExternalLink, MessageSquareHeart
} from "lucide-react";
import { useRole } from "../contexts/RoleContext";
import { hasPermission } from "../utils/rolePermissions";
import { RoleSwitcher } from "../components/RoleSwitcher";
import { NotificationSidebar } from "../components/NotificationSidebar";
import { useNotifications } from "../utils/useNotifications";
import { AskPolicy } from "../pages/AskPolicy"; 
import axios from "axios";

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useRole();

  const isProfileSettings = location.pathname === '/app/profile-settings';
  const isAskPolicy = location.pathname === '/app/ask-policy';

  const [sidebarCollapsed,  setSidebarCollapsed]  = useState(false);
  const [mobileMenuOpen,    setMobileMenuOpen]     = useState(false);
  const [showUserMenu,      setShowUserMenu]       = useState(false);
  const [showNotifications, setShowNotifications]  = useState(false);
  const [isAIChatOpen,      setIsAIChatOpen]       = useState(false); 

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifs = useNotifications();

  const currentRole = userRole || "STUDENT";
  const userProfile = {
    role:  currentRole,
    name:  sessionStorage.getItem("userName")  || "CTU User",
    email: sessionStorage.getItem("userEmail") || "user@ctu.edu.ph",
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowUserMenu(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const allMenuItems = [
    { path: "/app",                        label: "Dashboard",                  icon: LayoutDashboard,    permission: "canAccessDashboard"             },
    { path: "/app/ask-policy",             label: "AI Assistant",               icon: Sparkles,           permission: "canAccessAskPolicy"             },
    { path: "/app/knowledge-repository",   label: "Knowledge Repository",       icon: Database,           permission: "canAccessKnowledgeRepository"    },
    { path: "/app/paper-trail",            label: "Document Tracking",          icon: FileCheck,          permission: "canAccessPaperTrail"             },
    { path: "/app/accreditation-support",  label: "Accreditation Support",      icon: Award,              permission: "canAccessAccreditationSupport"   },
    { path: "/app/audit-trail",            label: "Audit Trail",                icon: Clock,              permission: "canAccessAuditTrail"             },
    { path: "/app/users-roles",            label: "Users & Roles",              icon: Users,              permission: "canAccessUsersRoles"             },
    { path: "/app/broadcast-announcement", label: "Broadcast Announcement",     icon: Radio,              permission: "canAccessBroadcastAnnouncement"  },
    { path: "/app/document-generator",     label: "Document Generator",         icon: FileText,           permission: "canAccessDocumentGenerator"      },
    { path: "/app/grade-evaluation",       label: "Grade Evaluation",           icon: ClipboardCheck,     permission: "canAccessGradeEvaluation"        },
    { path: "https://ctu-client-satisfaction-survey.vercel.app/",      label: "Client Satisfaction Survey", icon: MessageSquareHeart, permission: "canAccessClientSurvey", isExternal: true },
    { path: "https://ctu-client-satisfaction-survey-dash.vercel.app/", label: "Survey Analytics",          icon: HeartHandshake,     permission: "canAccessServiceSatisfaction", isExternal: true },
    { path: "/app/settings",               label: "Settings",                   icon: Settings,           permission: "canAccessSettings"              },
  ];

  const menuItems = allMenuItems.filter((item) =>
    hasPermission(userProfile.role, item.permission as any)
  );

  const getRoleBadge = () => {
    const designation = sessionStorage.getItem("userDesignation");
    const dept = sessionStorage.getItem("userDepartment");
    switch (userProfile.role) {
      case "ADMIN":   
        return { icon: Shield, color: "bg-[#DD7230]", label: "Administrator" };
      case "FACULTY": 
        if (designation === "College Dean") {
          return { icon: BookOpen, color: "bg-purple-600", label: `Dean • ${dept || 'College'}` };
        }
        if (designation === "Program Chair") {
          return { icon: BookOpen, color: "bg-blue-600", label: `Chair • ${dept || 'Program'}` };
        }
        return { icon: BookOpen, color: "bg-[#DD7230]", label: "Faculty" };
      default:        
        return { icon: GraduationCap, color: "bg-[#DD7230]", label: "Student" };
    }
  };

  const badge = getRoleBadge();

  const handleLogout = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
      await axios.post(`${API_BASE}/logout`, {}, { withCredentials: true });
    } catch (e) {
      console.error("Logout warning:", e);
    } finally {
      sessionStorage.clear();
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA]">

      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30 shadow-2xs">
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 -ml-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg md:hidden transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
              <img src="/ctu-logo.png" alt="CTU Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">CTU Argao Campus</div>
              <div className="text-[10px] sm:text-xs text-gray-500">Knowledge Management System</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <RoleSwitcher />

            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-600 hover:text-gray-900"
              aria-label={`Notifications${notifs.unreadCount > 0 ? ` — ${notifs.unreadCount} unread` : ""}`}
            >
              <Bell className="h-4.5 w-4.5" />
              {notifs.unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-2xs animate-[badgePop_300ms_ease-out]">
                  {notifs.unreadCount > 99 ? "99+" : notifs.unreadCount}
                </span>
              )}
            </button>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <div className={`w-7 h-7 ${badge.color} rounded-lg flex items-center justify-center text-white`}>
                  {badge.icon === Shield        && <Shield        className="h-3.5 w-3.5" />}
                  {badge.icon === BookOpen      && <BookOpen      className="h-3.5 w-3.5" />}
                  {badge.icon === GraduationCap && <GraduationCap className="h-3.5 w-3.5" />}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-semibold text-gray-900 leading-tight">{userProfile.name}</div>
                  <div className="text-[10px] text-gray-500">{badge.label}</div>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-900 truncate">{userProfile.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{userProfile.email}</p>
                  </div>
                  <Link 
                    to="/app/profile-settings" 
                    className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors cursor-pointer font-medium"
                  >
                    <Settings className="h-3.5 w-3.5 text-gray-400" />
                    <span>Settings</span>
                  </Link>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer font-medium"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Navigation */}
      {!isProfileSettings && (
        <>
          {/* Mobile Overlay Backdrop */}
          {mobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 animate-in fade-in"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar Drawer */}
          <aside
            className={`fixed left-0 top-0 md:top-[61px] bottom-0 bg-white border-r border-gray-200 transition-all duration-300 z-50 md:z-20 flex flex-col ${
              /* Mobile slide overlay logic */
              mobileMenuOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0"
            } ${
              /* Desktop collapse logic */
              sidebarCollapsed ? "md:w-16" : "md:w-64"
            }`}
          >
            {/* Mobile Header with Close Button */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between md:hidden bg-gray-50/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  <img src="/ctu-logo.png" alt="CTU Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 leading-tight">CTU Argao Campus</div>
                  <div className="text-[10px] text-gray-500">Navigation Menu</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto pt-4.5 pb-3 px-2.5 custom-scrollbar space-y-1">
                {menuItems.map((item: any) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;

                  if (item.isExternal) {
                    return (
                      <a
                        key={item.label}
                        href={item.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between gap-3 px-3 py-2 mb-1 rounded-lg transition-all cursor-pointer text-gray-600 hover:bg-orange-50 hover:text-[#DD7230] font-medium group"
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="h-4.5 w-4.5 shrink-0" />
                          <span className={`text-xs truncate ${sidebarCollapsed ? "md:hidden" : ""}`}>
                            {item.label}
                          </span>
                        </div>
                        {!sidebarCollapsed && (
                          <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 shrink-0 md:block hidden text-gray-400 group-hover:text-[#DD7230]" />
                        )}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 mb-1 rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#DD7230] text-white font-semibold shadow-2xs"
                          : "text-gray-600 hover:bg-orange-50 hover:text-[#DD7230] font-medium"
                      }`}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-white" : ""}`} />
                      <span className={`text-xs ${sidebarCollapsed ? "md:hidden" : ""}`}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop Collapse Button */}
              <div className="border-t border-gray-200 p-2.5 hidden md:block">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="w-full flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-500 hover:text-gray-800"
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <ChevronLeft className="h-4 w-4" />
                      <span>Collapse</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Main Layout Body: full width on mobile, offset on desktop */}
      <main
        className={`transition-all duration-300 pt-[61px] min-h-screen ml-0 ${
          isProfileSettings ? "md:ml-0" : (sidebarCollapsed ? "md:ml-16" : "md:ml-64")
        }`}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Notification Drawer */}
      <NotificationSidebar
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        {...notifs}
      />

      {/* ══ FLOATING ON-DISPLAY AI WIDGET SYSTEM ═════════════════════ */}
      {!isAskPolicy && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 select-none">
          {isAIChatOpen && (
            <div className="w-[360px] sm:w-[420px] h-[550px] bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
              
              <div className="p-4 bg-[#DD7230] text-white flex justify-between items-center shadow-md shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-pulse text-white" />
                  <span className="font-bold text-sm tracking-wide">AskPolicy Assistant</span>
                </div>
                <button 
                  onClick={() => setIsAIChatOpen(false)}
                  className="p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 bg-[#F5F7FA]">
                <AskPolicy isWidget={true} />
              </div>
            </div>
          )}

          <button
            onClick={() => setIsAIChatOpen(!isAIChatOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer bg-gradient-to-br from-[#DD7230] to-[#DD7230] ${
              isAIChatOpen ? "rotate-90 bg-gray-800" : ""
            }`}
          >
            {isAIChatOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6 animate-pulse" />}
          </button>
        </div>
      )}

      <style>{`
        @keyframes badgePop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.2); }
          100% { transform: scale(1);   opacity: 1; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E5E7EB;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #D1D5DB;
        }
      `}</style>
    </div>
  );
}