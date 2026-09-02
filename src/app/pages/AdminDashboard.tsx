import { useState, useEffect } from "react";
import { FileText, MessageSquare, CheckCircle, Clock, Users, Shield, AlertCircle, TrendingUp, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import axios from "axios";
import { useNavigate } from "react-router";

export function AdminDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  // Dynamic States
  const [globalStats, setGlobalStats] = useState({
    documents: 0,
    queries: 0,
    users: 0,
    qmsTotal: 0,
    qmsOverdue: 0,
    aaccupPending: 0,
    isoPending: 0,
    isoCompliance: 0,
  });
  const [userDistribution, setUserDistribution] = useState<any[]>([]);
  const [documentDistribution, setDocumentDistribution] = useState<any[]>([]);
  const [activityTrend, setActivityTrend] = useState<any[]>([]);
  const [popularTopics, setPopularTopics] = useState<any[]>([]);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [statsRes, userCountsRes, docsRes, queriesRes, versionsRes, popularRes, pendingRes] = await Promise.all([
          axios.get("http://localhost:8000/system-stats?role=ADMIN"),
          axios.get("http://localhost:8000/users/counts"),
          axios.get("http://localhost:8000/documents"),
          axios.get("http://localhost:8000/audit/queries"),
          axios.get("http://localhost:8000/audit/versions"),
          axios.get("http://localhost:8000/analytics/popular"),
          axios.get("http://localhost:8000/admin/accreditation-pending")
        ]);

        setGlobalStats({
          documents: statsRes.data.documents || 0,
          queries: statsRes.data.queries || 0,
          users: userCountsRes.data.all || 0,
          qmsTotal: statsRes.data.qmsTotal || statsRes.data.qms_total || 0,
          qmsOverdue: statsRes.data.qmsOverdue || statsRes.data.qms_overdue || 0,
          aaccupPending: statsRes.data.aaccupPending || statsRes.data.aaccup_pending || 0,
          isoPending: statsRes.data.isoPending || statsRes.data.iso_pending || 0,
          isoCompliance: statsRes.data.isoCompliance || statsRes.data.iso_compliance || 0,
        });

        setUserDistribution([
          { role: "Admin", count: userCountsRes.data.all - userCountsRes.data.students - userCountsRes.data.faculty },
          { role: "Faculty", count: userCountsRes.data.faculty },
          { role: "Student", count: userCountsRes.data.students }
        ]);

        const catCounts: Record<string, number> = {};
        docsRes.data.forEach((doc: any) => {
          const cat = doc.category || "Uncategorized";
          catCounts[cat] = (catCounts[cat] || 0) + 1;
        });
        
        const amberPalette = ["#DD7230", "#DD7230", "#DD7230", "#FFB84D", "#B36B00", "#FFD280"];
        const formattedPieData = Object.keys(catCounts).map((key, index) => ({
          name: key,
          value: catCounts[key],
          color: amberPalette[index % amberPalette.length]
        }));
        setDocumentDistribution(formattedPieData);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const displayMonths: string[] = [];
        const currentMonthIdx = new Date().getMonth();
        
        for(let i = 5; i >= 0; i--) {
            let mIndex = currentMonthIdx - i;
            if (mIndex < 0) mIndex += 12;
            displayMonths.push(monthNames[mIndex]);
        }

        const trendMap: Record<string, { month: string, documents: number, queries: number }> = {};
        displayMonths.forEach(m => trendMap[m] = { month: m, documents: 0, queries: 0 });

        const extractMonth = (dateStr: string) => {
          if (!dateStr) return "";
          try {
            if (dateStr.includes("-") && !dateStr.includes(",")) {
              return monthNames[new Date(dateStr.split('T')[0]).getMonth()];
            }
            return dateStr.substring(0, 3);
          } catch (e) { return ""; }
        };

        queriesRes.data.forEach((q: any) => {
          const m = extractMonth(q.timestamp);
          if (trendMap[m]) trendMap[m].queries++;
        });

        versionsRes.data.forEach((v: any) => {
          const m = extractMonth(v.timestamp);
          if (trendMap[m]) trendMap[m].documents++;
        });

        setActivityTrend(displayMonths.map(m => trendMap[m]));
        setPendingReviewCount(pendingRes.data.length);
        setPopularTopics(popularRes.data || []);

      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = [
    {
      label: "Total Knowledge Assets",
      value: globalStats.documents,
      icon: FileText,
      color: "#DD7230", // Base Amber
      subtitle: "Policies, Evidences & Records",
      path: "/app/knowledge-repository"
    },
    {
      label: "AI System Inquiries",
      value: globalStats.queries,
      icon: MessageSquare,
      color: "#DD7230", // Medium Amber
      subtitle: "All-Time Inquiries Resolved",
      path: "/app/audit-trail"
    },
    {
      label: "Campus QMS Compliance",
      value: `${globalStats.isoCompliance}%`,
      icon: CheckCircle,
      color: "#006837", // CTU Green
      subtitle: "ISO 9001:2015 Active Cycle",
      path: "/app/accreditation-support"
    },
    {
      label: "Pending Action Plans",
      value: globalStats.qmsOverdue,
      icon: AlertTriangle,
      color: globalStats.qmsOverdue > 0 ? "#EF4444" : "#006837",
      subtitle: globalStats.qmsOverdue > 0 ? "MRC Form 6 Overdue Items" : "All Action Plans On Track",
      path: "/app/accreditation-support"
    }
  ];

  // Dynamic, actionable alerts derived from real system queues
  const systemAlerts: Array<{ message: string; severity: "warning" | "error" | "success" | "info"; icon: any; path?: string }> = [];

  if (globalStats.aaccupPending > 0) {
    systemAlerts.push({
      message: `${globalStats.aaccupPending} AACCUP/CHED document${globalStats.aaccupPending !== 1 ? 's are' : ' is'} awaiting Admin Review.`,
      severity: "warning",
      icon: AlertCircle,
      path: "/app/accreditation-support"
    });
  }

  if (globalStats.isoPending > 0) {
    systemAlerts.push({
      message: `${globalStats.isoPending} ISO 9001 clause${globalStats.isoPending !== 1 ? 's have' : ' has'} pending evidence to verify.`,
      severity: "warning",
      icon: Clock,
      path: "/app/accreditation-support"
    });
  }

  if (globalStats.qmsOverdue > 0) {
    systemAlerts.push({
      message: `${globalStats.qmsOverdue} QMS Action Plan${globalStats.qmsOverdue !== 1 ? 's' : ''} (MRC Form 6) ${globalStats.qmsOverdue !== 1 ? 'are' : 'is'} past target completion date.`,
      severity: "error",
      icon: AlertTriangle,
      path: "/app/accreditation-support"
    });
  }

  if (systemAlerts.length === 0) {
    systemAlerts.push({
      message: "All compliance queues are clear. System health is optimal.",
      severity: "success",
      icon: CheckCircle,
      path: "/app/accreditation-support"
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-7 w-7 animate-spin text-[#DD7230]" />
        <p className="text-xs text-gray-500 font-medium italic">Compiling Institutional Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Complete system telemetry, governance queues, and management controls</p>
        </div>
        <div className="flex items-center gap-2 bg-[#DD7230] text-white px-3.5 py-1.5 rounded-lg shadow-2xs self-start sm:self-auto">
          <Shield className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">System Administrator</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              onClick={() => stat.path && navigate(stat.path)}
              className="bg-white rounded-xl border border-gray-200/80 p-4 shadow-2xs hover:border-[#DD7230] hover:shadow-xs transition-all cursor-pointer group"
              title={`View ${stat.label}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider group-hover:text-[#DD7230] transition-colors">{stat.label}</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <Icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <h3 className="text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </h3>
                <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1 group-hover:text-gray-700">
                  {stat.subtitle}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Alerts */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-4 w-4 text-[#DD7230]" />
          <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">System Health & Compliance Alerts</h2>
        </div>
        <div className="space-y-2">
          {systemAlerts.map((alert, index) => {
            const Icon = alert.icon;
            return (
              <div
                key={index}
                onClick={() => alert.path && navigate(alert.path)}
                className={`flex items-center justify-between p-3 rounded-lg border text-xs font-medium transition-all ${
                  alert.path ? "cursor-pointer hover:shadow-2xs" : ""
                } ${
                  alert.severity === "warning"
                    ? "bg-amber-50/60 border-amber-200/60 text-amber-800 hover:bg-amber-50"
                    : alert.severity === "error"
                    ? "bg-rose-50/60 border-rose-200/60 text-rose-800 hover:bg-rose-50"
                    : alert.severity === "info"
                    ? "bg-blue-50/60 border-blue-200/60 text-blue-800 hover:bg-blue-50"
                    : "bg-emerald-50/60 border-emerald-200/60 text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      alert.severity === "warning"
                        ? "text-[#DD7230]"
                        : alert.severity === "error"
                        ? "text-rose-600"
                        : alert.severity === "info"
                        ? "text-blue-600"
                        : "text-emerald-600"
                    }`}
                  />
                  <span>{alert.message}</span>
                </div>
                {alert.path && <ArrowRight className="h-3.5 w-3.5 opacity-60 shrink-0 ml-2" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Activity Trend Chart */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-2xs h-[360px] flex flex-col">
          <h2 className="text-xs font-semibold text-gray-900 mb-4 flex items-center gap-2 shrink-0">
            <TrendingUp className="h-4 w-4 text-[#DD7230]" /> Activity Trends (6 Months)
          </h2>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 500 }} />
                <Line type="monotone" dataKey="documents" stroke="#DD7230" strokeWidth={2.5} dot={{ r: 3.5 }} name="Documents Uploaded" activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="queries" stroke="#DD7230" strokeWidth={2.5} dot={{ r: 3.5 }} name="AI Queries" activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Document Taxonomy Chart */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-2xs h-[360px] flex flex-col">
          <h2 className="text-xs font-semibold text-gray-900 mb-4 flex items-center gap-2 shrink-0">
            <FileText className="h-4 w-4 text-[#DD7230]" /> Document Taxonomy
          </h2>
          <div className="flex-1 min-h-0">
            {documentDistribution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-gray-400 font-medium italic">No documents uploaded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={documentDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                    outerRadius={90}
                    innerRadius={36}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {documentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* User Distribution */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-2xs h-[360px] flex flex-col">
          <h2 className="text-xs font-semibold text-gray-900 mb-4 flex items-center gap-2 shrink-0">
            <Users className="h-4 w-4 text-[#DD7230]" /> Active Demographics
          </h2>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="role" tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                <Bar dataKey="count" fill="#DD7230" radius={[4, 4, 0, 0]} barSize={44} name="Total Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trending AI Policy Topics */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-2xs h-[360px] flex flex-col">
          <h2 className="text-xs font-semibold text-gray-900 mb-1 flex items-center gap-2 shrink-0">
            <MessageSquare className="h-4 w-4 text-[#DD7230]" /> Trending AI Policy Topics
          </h2>
          <p className="text-[11px] text-gray-500 mb-3">Most frequent subjects queried by students and faculty via the AI Assistant.</p>
          <div className="flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar">
            {popularTopics.length === 0 ? (
               <div className="flex h-32 items-center justify-center text-xs text-gray-400 font-medium italic">No recent queries.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {popularTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="px-3 py-1.5 border border-gray-200 bg-gray-50/70 hover:bg-orange-50/30 hover:border-[#DD7230] rounded-lg text-xs font-medium text-gray-700 shadow-2xs transition-colors cursor-default"
                  >
                    # {topic.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}