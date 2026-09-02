import { useState, useEffect } from "react";
import { FileText, MessageSquare, BookOpen, Award, TrendingUp, Clock, UploadCloud, Search, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import axios from "axios";
import { useNavigate } from "react-router";

export function FacultyDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Real Data States
  const [totalDocs, setTotalDocs] = useState(0);
  const [myQueriesCount, setMyQueriesCount] = useState(0);
  const [myAccessCount, setMyAccessCount] = useState(0);
  const [userDepartment, setUserDepartment] = useState("Program"); 
  
  // Charts & Lists
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // Accreditation State
  const [accreditationScore, setAccreditationScore] = useState(0);
  const [missingEvidence, setMissingEvidence] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const userEmail = sessionStorage.getItem('userEmail') || '';
        const userDept = sessionStorage.getItem('userDepartment') || 'BSIT'; 
        
        setUserDepartment(userDept); 

        const [statsRes, historyRes, accessRes, accredRes] = await Promise.all([
          axios.get("http://localhost:8000/system-stats?role=FACULTY"),
          axios.get(`http://localhost:8000/chat-history?email=${userEmail}`),
          axios.get("http://localhost:8000/audit/access"),
          axios.get(`http://localhost:8000/accreditation-status/${userDept}`) 
        ]);

        // 1. Top Level Stats
        setTotalDocs(statsRes.data.documents || 0);
        
        const userQueries = historyRes.data.filter((msg: any) => msg.role === 'user');
        setMyQueriesCount(userQueries.length);

        const myAccessLogs = accessRes.data.filter((log: any) => log.user === userEmail);
        setMyAccessCount(myAccessLogs.length);

        // 2. Accreditation Widget
        setAccreditationScore(accredRes.data.overall || 0);
        setMissingEvidence(accredRes.data.gaps || 0);

        // 3. Process Recent Activity
        const formattedActivity = myAccessLogs.slice(0, 5).map((log: any) => ({
          title: log.document,
          action: log.action, 
          date: log.timestamp.split(' - ')[0],
          time: log.timestamp.split(' - ')[1]
        }));
        setRecentActivity(formattedActivity);

        // 4. Process Engagement Chart 
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const currentMonthIndex = new Date().getMonth();
        const displayMonths = [];
        
        for(let i = 5; i >= 0; i--) {
            let mIndex = currentMonthIndex - i;
            if (mIndex < 0) mIndex += 12;
            displayMonths.push(monthNames[mIndex]);
        }

        const counts: Record<string, { queries: number, access: number }> = {};
        displayMonths.forEach(m => counts[m] = { queries: 0, access: 0 });

        userQueries.forEach((q: any) => {
          const monthStr = q.created_at ? new Date(q.created_at).toLocaleString('default', { month: 'short' }) : "Jan";
          if (counts[monthStr]) counts[monthStr].queries++;
        });

        myAccessLogs.forEach((a: any) => {
          const monthStr = a.timestamp.split(' ')[0].substring(0, 3);
          if (counts[monthStr]) counts[monthStr].access++;
        });

        const finalChartData = displayMonths.map(m => ({
          month: m,
          Queries: counts[m].queries,
          Views: counts[m].access
        }));

        setChartData(finalChartData);

      } catch (error) {
        console.error("Failed to fetch faculty dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = [
    {
      label: "Institutional Knowledge Base",
      value: totalDocs,
      icon: BookOpen,
      color: "#DD7230", // Base Amber
      subtitle: "University Policies & Manuals",
      path: "/app/knowledge-repository"
    },
    {
      label: "AI Policy Consultations",
      value: myQueriesCount,
      icon: MessageSquare,
      color: "#DD7230", // Medium Amber
      subtitle: "Interactive Query Inquiries",
      path: "/app/ask-policy"
    },
    {
      label: "Document Access Logs",
      value: myAccessCount,
      icon: FileText,
      color: "#DD7230", // Dark Amber
      subtitle: "Total Views & Downloads",
      path: "/app/knowledge-repository"
    },
    {
      label: "Quality Assurance Tasks",
      value: missingEvidence,
      icon: Clock,
      color: missingEvidence > 0 ? "#CE0000" : "#006837",
      subtitle: missingEvidence > 0 ? `Pending Evidence for ${userDepartment}` : `All Evidence Compliant (${userDepartment})`,
      path: "/app/accreditation-support"
    }
  ];

  const pieData = [
    { name: "Compliant", value: accreditationScore },
    { name: "Missing", value: 100 - accreditationScore }
  ];
  
  // UPDATED: Now using Base Amber and Gray instead of Green
  const PIE_COLORS = ["#DD7230", "#E5E7EB"]; 

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-7 w-7 animate-spin text-[#DD7230]" />
        <p className="text-xs text-gray-500 font-medium italic">Loading Faculty Dashboard Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Faculty Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage institutional knowledge, evidence submissions, and accreditation compliance</p>
        </div>
        <div className="flex items-center gap-2 bg-[#DD7230] text-white px-3.5 py-1.5 rounded-lg shadow-2xs self-start sm:self-auto">
          <Award className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Faculty Portal</span>
        </div>
      </div>

      {/* Top Stats Cards */}
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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${stat.color}15` }}>
                  <Icon className="h-4 w-4" style={{ color: stat.color }} />
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <h3 className="text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </h3>
                <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-700">{stat.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Engagement Activity Chart */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-2xs lg:col-span-2">
          <h2 className="text-xs font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#DD7230]" />
            My System Engagement (6 Months)
          </h2>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
              <Bar dataKey="Views" fill="#DD7230" radius={[3, 3, 0, 0]} maxBarSize={36} name="Document Views" />
              <Bar dataKey="Queries" fill="#DD7230" radius={[3, 3, 0, 0]} maxBarSize={36} name="AI Queries" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Accreditation Readiness Widget */}
        <div 
          onClick={() => navigate('/app/accreditation-support')}
          className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-2xs flex flex-col items-center justify-between relative overflow-hidden cursor-pointer hover:border-[#DD7230] hover:shadow-xs transition-all group"
          title="Open Accreditation Support"
        >
          <div className="w-full">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-2 group-hover:text-[#DD7230] transition-colors">
                <ShieldCheck className="h-4 w-4 text-[#DD7230]" />
                {userDepartment} QA Readiness
              </h2>
              <span className="text-[10px] text-gray-400 font-medium group-hover:text-[#DD7230]">View &rarr;</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">Real-time accreditation compliance</p>
          </div>
          
          <div className="relative w-full h-[170px] flex items-center justify-center my-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={72}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-[#DD7230] group-hover:scale-105 transition-transform">{accreditationScore}%</span>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Compliant</span>
            </div>
          </div>

          <div className="w-full pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Missing Evidence</span>
            <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200/60 text-[11px]">{missingEvidence} items</span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Recent Activity List */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-2xs flex flex-col h-full">
          <h2 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#DD7230]" />
            My Recent Activity
          </h2>
          {recentActivity.length === 0 ? (
             <div className="text-center py-8 text-xs text-gray-400 italic border border-dashed border-gray-200 rounded-lg flex-1 flex items-center justify-center">
               No recent activity recorded.
             </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[160px] pr-1 flex-1 custom-scrollbar">
              {recentActivity.map((log, index) => (
                <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50/60 rounded-lg hover:bg-orange-50/20 transition-colors border border-gray-200/70">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className={`p-1.5 rounded-md shrink-0 ${log.action === 'Download' ? 'bg-orange-50 text-[#DD7230]' : 'bg-orange-50 text-[#DD7230]'}`}>
                      {log.action === 'Download' ? <UploadCloud className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                    </div>
                    <div className="truncate">
                      <p className="text-xs text-gray-900 font-medium truncate">{log.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{log.action} • {log.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button 
            onClick={() => navigate('/app/accreditation-support')} 
            className="bg-gradient-to-br from-[#DD7230] to-[#DD7230] rounded-xl p-4 text-left hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden active:scale-95 cursor-pointer text-white shadow-2xs"
          >
            <div className="w-9 h-9 bg-white/20 backdrop-blur-xs rounded-lg flex items-center justify-center mb-4">
              <UploadCloud className="h-5 w-5 text-white" />
            </div>
            <div className="relative z-10">
              <h3 className="text-sm font-bold text-white mb-0.5">Submit Evidence</h3>
              <p className="text-[11px] text-white/90 font-normal">Upload QA compliance documents</p>
            </div>
            <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>

          <button 
            onClick={() => navigate('/app/knowledge-repository')} 
            className="bg-gradient-to-br from-[#DD7230] to-[#DD7230] rounded-xl p-4 text-left hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden active:scale-95 cursor-pointer text-white shadow-2xs"
          >
            <div className="w-9 h-9 bg-white/20 backdrop-blur-xs rounded-lg flex items-center justify-center mb-4">
              <Search className="h-5 w-5 text-white" />
            </div>
            <div className="relative z-10">
              <h3 className="text-sm font-bold text-white mb-0.5">Browse Policies</h3>
              <p className="text-[11px] text-white/90 font-normal">Access institutional repository</p>
            </div>
            <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>
        </div>

      </div>
    </div>
  );
}