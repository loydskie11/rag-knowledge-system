// src/components/NotificationSidebar.tsx
// ----------------------------------------------------------------
// Receives all data/actions as props from DashboardLayout.
// Updated UI/UX to match the overall CTU Argao KMS design system.
// ----------------------------------------------------------------

import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  X, Check, Trash2, CheckCircle2, AlertTriangle,
  Info, Bell, Loader2, RefreshCw, ExternalLink, Sparkles, CheckCheck
} from "lucide-react";
import {
  timeAgo,
  type FilterType,
  type Notification,
  type UseNotificationsReturn,
} from "../utils/useNotifications";

// ─── Props ───────────────────────────────────────────────────────
interface NotificationSidebarProps extends UseNotificationsReturn {
  isOpen:   boolean;
  onClose:  () => void;
}

// ─── Detect special navigation routes from title ──────────────────
function getNotificationRoute(notif: Notification): string | null {
  const titleLower = notif.title.toLowerCase();
  if (titleLower.includes("faculty awaiting verification")) return "/app/users-roles";
  if (titleLower.includes("paper trail") || titleLower.includes("document received")) return "/app/paper-trail";
  if (titleLower.includes("document") || titleLower.includes("repository")) return "/app/knowledge-repository";
  if (titleLower.includes("broadcast") || titleLower.includes("announcement")) return "/app/broadcast-announcement";
  return null;
}

// ─── Icon per type ───────────────────────────────────────────────
function NotifIcon({ type, read }: { type: string; read: boolean }) {
  const base = "h-4 w-4 transition-colors";
  const dim  = read ? "opacity-50" : "";
  switch (type) {
    case "success": return <CheckCircle2 className={`${base} ${dim} text-emerald-500`} />;
    case "warning": return <AlertTriangle className={`${base} ${dim} text-amber-500`}  />;
    case "error":   return <AlertTriangle className={`${base} ${dim} text-rose-500`}  />;
    default:        return <Info         className={`${base} ${dim} text-[#DD7230]`}  />;
  }
}

// ─── Type colour tokens ──────────────────────────────────────────
const TYPE_COLORS: Record<string, { bar: string; dot: string; badge: string }> = {
  success: { bar: "bg-emerald-500", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200/60" },
  warning: { bar: "bg-amber-500",   dot: "bg-amber-500",   badge: "bg-amber-50  text-amber-700 border-amber-200/60"   },
  error:   { bar: "bg-rose-500",    dot: "bg-rose-500",    badge: "bg-rose-50   text-rose-700 border-rose-200/60"      },
  info:    { bar: "bg-[#DD7230]",   dot: "bg-[#DD7230]",   badge: "bg-orange-50 text-[#DD7230] border-[#DD7230]/30" },
};

const typeLabel: Record<string, string> = {
  success: "Success", warning: "Warning", error: "Alert", info: "Info",
};

// ─── Filter pill ─────────────────────────────────────────────────
function Pill({
  label, active, count, onClick,
}: { label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 relative py-1.5 px-3 rounded-md text-xs font-medium
        transition-all select-none cursor-pointer flex items-center justify-center gap-1.5
        ${active
          ? "bg-white text-gray-900 shadow-2xs font-semibold"
          : "text-gray-500 hover:text-gray-800"}
      `}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className={`
          inline-flex items-center justify-center
          min-w-[18px] h-4 px-1.5 rounded-full text-[10px] font-semibold
          ${active ? "bg-[#DD7230] text-white" : "bg-gray-200/80 text-gray-600"}
        `}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Single notification row ─────────────────────────────────────
function NotifRow({
  notif,
  onRead,
  onNavigate,
}: {
  notif:       Notification;
  onRead:      (id: number) => void;
  onNavigate:  (path: string) => void;
}) {
  const colors = TYPE_COLORS[notif.type] || TYPE_COLORS.info;
  const targetRoute = getNotificationRoute(notif);

  function handleClick() {
    // Mark as read first (optimistic)
    if (!notif.is_read) onRead(notif.id);

    // Navigate if a specific route exists
    if (targetRoute) {
      onNavigate(targetRoute);
    }
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      className={`
        group relative flex gap-3 px-4 py-3.5
        border-b border-gray-100
        cursor-pointer select-none
        transition-colors
        focus:outline-none focus:bg-gray-50
        ${notif.is_read
          ? "bg-white hover:bg-gray-50/70"
          : "bg-orange-50/25 hover:bg-orange-50/50"}
      `}
    >
      {/* Left subtle unread accent line */}
      {!notif.is_read && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#DD7230]" />
      )}

      {/* Icon bubble */}
      <div className={`
        shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center transition-colors
        ${notif.is_read
          ? "bg-gray-100 text-gray-400"
          : "bg-white border border-gray-200 shadow-2xs text-gray-700"}
      `}>
        <NotifIcon type={notif.type} read={notif.is_read} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Type badge + time */}
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5">
            <span className={`
              text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded border
              ${notif.is_read ? "bg-gray-100 text-gray-400 border-gray-200/60" : colors.badge}
            `}>
              {typeLabel[notif.type] || notif.type}
            </span>
            {!notif.is_read && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#DD7230]" title="Unread" />
            )}
          </div>
          <time className="text-[10px] text-gray-400 font-normal shrink-0">
            {timeAgo(notif.created_at)}
          </time>
        </div>

        {/* Title */}
        <p className={`
          text-xs leading-snug
          ${notif.is_read ? "text-gray-700 font-medium" : "text-gray-900 font-semibold"}
        `}>
          {notif.title}
        </p>

        {/* Message */}
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
          {notif.message}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────
export function NotificationSidebar({
  isOpen, onClose,
  notifications, unreadCount, filter, isLoading, error,
  setFilter, refresh, markAllRead, markOneRead, deleteAllRead,
}: NotificationSidebarProps) {
  const navigate  = useNavigate();
  const panelRef  = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const readCount = notifications.filter((n: Notification) => n.is_read).length;
  const totalAll  = notifications.length;

  // Navigate + close panel
  function handleNavigate(path: string) {
    onClose();
    navigate(path);
  }

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden
      />

      {/* ── Panel ── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Notifications panel"
        className="fixed right-0 top-0 bottom-0 w-[380px] max-w-[92vw] z-50 flex flex-col bg-white shadow-xl border-l border-gray-200"
        style={{ animation: "notifSlideIn 200ms cubic-bezier(0.22,1,0.36,1) both" }}
      >

        {/* ══ Header ════════════════════════════════════════════════════ */}
        <div className="flex-shrink-0 bg-white px-4 pt-4 pb-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#DD7230] rounded-full" />
                )}
              </div>

              <div>
                <h2 className="text-sm font-bold text-gray-900 leading-none">
                  Notifications
                </h2>
                <p className="text-[11px] text-gray-400 mt-1">
                  {unreadCount > 0
                    ? `${unreadCount} unread update${unreadCount !== 1 ? "s" : ""}`
                    : "You're all caught up"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={refresh}
                disabled={isLoading}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors cursor-pointer text-gray-400 hover:text-gray-700"
                title="Refresh notifications"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-[#DD7230]" : ""}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors cursor-pointer text-gray-400 hover:text-gray-700"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Segmented Control with live counts */}
          <div className="flex bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/80 gap-0.5">
            <Pill
              label="All"
              active={filter === "all"}
              count={totalAll}
              onClick={() => setFilter("all" as FilterType)}
            />
            <Pill
              label="Unread"
              active={filter === "unread"}
              count={unreadCount}
              onClick={() => setFilter("unread" as FilterType)}
            />
          </div>
        </div>

        {/* ══ Action Toolbar ══════════════════════════════════════════ */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50/50 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="
                flex items-center gap-1 px-2.5 py-1 rounded-md
                text-[11px] font-medium
                border border-gray-300 bg-white text-gray-700
                hover:bg-gray-50 hover:text-gray-900
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors cursor-pointer shadow-2xs
              "
            >
              <CheckCheck className="h-3 w-3 text-gray-500" />
              Mark all read
            </button>

            <button
              onClick={deleteAllRead}
              disabled={readCount === 0}
              className="
                flex items-center gap-1 px-2.5 py-1 rounded-md
                text-[11px] font-medium
                border border-gray-300 bg-white text-gray-700
                hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors cursor-pointer shadow-2xs
              "
            >
              <Trash2 className="h-3 w-3 text-gray-500" />
              Clear read
            </button>
          </div>

          {isLoading && (
            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
              <Loader2 className="h-3 w-3 text-[#DD7230] animate-spin" />
              Syncing...
            </span>
          )}
        </div>

        {/* ══ Notification List ════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* Error */}
          {error && (
            <div className="m-4 px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-center">
              <p className="text-xs font-medium text-rose-700">{error}</p>
              <button
                onClick={refresh}
                className="mt-1 text-xs text-rose-600 underline font-medium hover:text-rose-800 cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mb-3 text-gray-400">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-gray-800">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-[220px]">
                {filter === "unread"
                  ? "You have reviewed all incoming notifications."
                  : "We'll notify you when important system activities occur."}
              </p>
              {filter === "unread" && totalAll > 0 && (
                <button
                  onClick={() => setFilter("all")}
                  className="mt-3 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                >
                  View All Notifications
                </button>
              )}
            </div>
          )}

          {/* Loading Skeletons */}
          {isLoading && notifications.length === 0 && (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-2.5 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                    <div className="h-2 bg-gray-100 rounded w-4/5" />
                    <div className="h-2 bg-gray-100 rounded w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notification Item Rows */}
          {notifications.map((notif: Notification) => (
            <NotifRow
              key={notif.id}
              notif={notif}
              onRead={markOneRead}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      </div>

      {/* ── Slide-in animation ── */}
      <style>{`
        @keyframes notifSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
