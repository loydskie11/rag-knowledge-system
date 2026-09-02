import { useState, useEffect } from "react";
import { BookOpen, MessageSquare, Calendar, GraduationCap, Clock, Search, ArrowRight, TrendingUp, History, FileText, Loader2, X, Radio } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import axios from "axios";
import { useNavigate } from "react-router";

export function StudentDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  // Real Data States
  const [totalDocs, setTotalDocs] = useState(0);
  const [weeklyQueries, setWeeklyQueries] = useState(0);
  const [recentViewsCount, setRecentViewsCount] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  
  // Live Announcements State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const userEmail = sessionStorage.getItem('userEmail') || '';

        const [statsRes, historyRes, accessRes, queriesRes, announcementsRes] = await Promise.all([
          axios.get("http://localhost:8000/system-stats?role=STUDENT"),
          axios.get(`http://localhost:8000/chat-history?email=${userEmail}`),
          axios.get("http://localhost:8000/audit/access"),
          axios.get("http://localhost:8000/audit/queries"),
          axios.get("http://localhost:8000/announcements")
        ]);

        // 1. Available Resources
        setTotalDocs(statsRes.data.documents || 0);

        // 2. My Queries
        const userQueries = historyRes.data.filter((msg: any) => msg.role === 'user');
        setWeeklyQueries(userQueries.length);

        // 3. Process Access Logs
        const myAccessLogs = accessRes.data.filter((log: any) => log.user === userEmail);
        setRecentViewsCount(myAccessLogs.length);

        const formattedRecentDocs = myAccessLogs.slice(0, 4).map((log: any) => ({
          title: log.document,
          category: log.action, 
          date: log.timestamp.split(' - ')[0] 
        }));
        setRecentDocs(formattedRecentDocs);

        // 4. Process Chart Data
        const myAllTimeQueries = queriesRes.data.filter((log: any) => log.user === userEmail);
        const monthCounts: Record<string, number> = { 
          "Jan": 0, "Feb": 0, "Mar": 0, "Apr": 0, "May": 0, "Jun": 0, 
          "Jul": 0, "Aug": 0, "Sep": 0, "Oct": 0, "Nov": 0, "Dec": 0 
        };

        myAllTimeQueries.forEach((q: any) => {
          const monthStr = q.timestamp.split(' ')[0].substring(0, 3); 
          if (monthCounts[monthStr] !== undefined) {
             monthCounts[monthStr]++;
          }
        });

        const currentMonthIndex = new Date().getMonth();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const displayMonths = [];
        
        for(let i = 5; i >= 0; i--) {
            let mIndex = currentMonthIndex - i;
            if (mIndex < 0) mIndex += 12;
            displayMonths.push(monthNames[mIndex]);
        }

        const finalChartData = displayMonths.map(m => ({ 
          month: m, 
          queries: monthCounts[m] || 0 
        }));
        
        setChartData(finalChartData);

        // Process Live Announcements
        const validAnnouncements = announcementsRes.data
          .filter((a: any) => 
            a.status === "Sent" && 
            (a.recipients.includes("All Users") || a.recipients.includes("All Students"))
          )
          .map((a: any) => {
            const d = new Date(a.sent_date);
            return {
              id: a.id,
              title: a.title,
              content: a.content,
              sent_by: a.sent_by,
              date: d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            };
          })
          .slice(0, 4);

        setAnnouncements(validAnnouncements);

      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleOpenAnnouncement = (announcement: any) => {
    setSelectedAnnouncement(announcement);
    if (announcement?.id) {
      axios.post(`http://localhost:8000/announcements/${announcement.id}/read`).catch((err) => {
        console.error("Failed to record announcement read:", err);
      });
    }
  };

  const stats = [
    {
      label: "University Policies & Guides",
      value: totalDocs,
      icon: BookOpen,
      color: "#DD7230", // Base Amber
      subtitle: "Active in Knowledge Base",
      path: "/app/knowledge-repository"
    },
    {
      label: "My AI Inquiries",
      value: weeklyQueries,
      icon: MessageSquare,
      color: "#DD7230", // Medium Amber
      subtitle: "Interactive Chat Sessions",
      path: "/app/ask-policy"
    },
    {
      label: "Recent Document Activity",
      value: recentViewsCount,
      icon: Clock,
      color: "#DD7230", // Dark Amber
      subtitle: "Policies Accessed & Viewed",
      path: "/app/knowledge-repository"
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-7 w-7 animate-spin text-[#DD7230]" />
        <p className="text-xs text-gray-500 font-medium italic">Loading Student Portal Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200 relative pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Access university policies, AI assistance, campus announcements, and academic resources</p>
        </div>
        <div className="flex items-center gap-2 bg-[#DD7230] text-white px-3.5 py-1.5 rounded-lg shadow-2xs self-start sm:self-auto">
          <GraduationCap className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Student Portal</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-700">{stat.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Chart & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Query Activity Chart */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-2xs lg:col-span-2">
          <h2 className="text-xs font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#DD7230]" />
            My AI Query Activity (6 Months)
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip 
                cursor={{ fill: '#F9FAFB' }}
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '11px'
                }}
                itemStyle={{ color: '#DD7230' }}
              />
              <Bar dataKey="queries" fill="#DD7230" radius={[3, 3, 0, 0]} barSize={36} name="AI Queries" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Live Announcements */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-2xs flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-rose-600" />
              <h2 className="text-xs font-semibold text-gray-900">Recent Broadcasts</h2>
            </div>
            {announcements.length > 0 && (
              <span className="bg-rose-50 border border-rose-200/60 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{announcements.length} New</span>
            )}
          </div>
          
          <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {announcements.length === 0 ? (
               <div className="text-center py-10 text-xs text-gray-400 italic border border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-1.5 flex-1">
                 <Radio className="h-6 w-6 text-gray-300" />
                 <span>No recent broadcasts available.</span>
               </div>
            ) : (
              announcements.map((announcement, index) => (
                <div
                  key={index}
                  onClick={() => handleOpenAnnouncement(announcement)}
                  className="flex items-start gap-2.5 p-2.5 bg-gray-50/60 rounded-lg hover:bg-orange-50/30 hover:border-[#DD7230] transition-all border border-gray-200/70 cursor-pointer group"
                >
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#DD7230] shrink-0 group-hover:scale-125 transition-transform"></div>
                  <div className="overflow-hidden">
                    <p className="text-xs text-gray-900 font-semibold leading-snug truncate group-hover:text-[#DD7230] transition-colors">{announcement.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{announcement.date}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recently Viewed Docs & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Recently Viewed Docs */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-2xs flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-900 flex items-center gap-2">
              <History className="h-4 w-4 text-[#DD7230]" />
              Recently Accessed Documents
            </h2>
            <button
              onClick={() => navigate('/app/knowledge-repository')}
              className="text-[11px] text-[#DD7230] hover:text-[#DD7230] font-medium cursor-pointer"
            >
              Browse All &rarr;
            </button>
          </div>
          
          {recentDocs.length === 0 ? (
             <div className="text-center py-8 text-xs text-gray-400 italic border border-dashed border-gray-200 rounded-lg flex-1 flex items-center justify-center">
               No documents accessed yet.
             </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[160px] pr-1 flex-1 custom-scrollbar">
              {recentDocs.map((doc, index) => (
                <div
                  key={index}
                  onClick={() => navigate('/app/knowledge-repository')}
                  className="flex items-center justify-between p-2.5 bg-gray-50/60 rounded-lg hover:bg-orange-50/20 hover:border-[#DD7230] transition-all border border-gray-200/70 cursor-pointer group"
                  title="Open in Knowledge Repository"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="p-1.5 rounded-md bg-orange-50 text-[#DD7230] shrink-0">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs text-gray-900 font-medium truncate group-hover:text-[#DD7230] transition-colors">{doc.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">{doc.category}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap pl-3 shrink-0">{doc.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <button 
            onClick={() => navigate('/app/knowledge-repository')} 
            className="bg-gradient-to-br from-[#DD7230] to-[#DD7230] rounded-xl p-4 text-left hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden active:scale-95 cursor-pointer text-white shadow-2xs"
          >
            <div className="w-9 h-9 bg-white/20 backdrop-blur-xs rounded-lg flex items-center justify-center mb-4">
              <Search className="h-5 w-5 text-white" />
            </div>
            <div className="relative z-10">
              <h3 className="text-sm font-bold text-white mb-0.5">Browse Repository</h3>
              <p className="text-[11px] text-white/90 font-normal">Search student policies & manuals</p>
            </div>
            <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>

          <button 
            onClick={() => navigate('/app/ask-policy')} 
            className="bg-gradient-to-br from-[#DD7230] to-[#DD7230] rounded-xl p-4 text-left hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden active:scale-95 cursor-pointer text-white shadow-2xs"
          >
            <div className="w-9 h-9 bg-white/20 backdrop-blur-xs rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div className="relative z-10">
              <h3 className="text-sm font-bold text-white mb-0.5">Ask AskPolicy AI</h3>
              <p className="text-[11px] text-white/90 font-normal">Get instant policy answers</p>
            </div>
            <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>

      {/* ANNOUNCEMENT VIEW MODAL */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center border border-rose-200/60">
                  <Radio className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900">Official Broadcast</h3>
                  <p className="text-[10px] text-gray-500 font-medium">{selectedAnnouncement.date}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAnnouncement(null)} 
                className="text-gray-400 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5">
              <h4 className="text-sm font-bold text-gray-900 mb-3 leading-tight">{selectedAnnouncement.title}</h4>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/70 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">
                {selectedAnnouncement.content}
              </div>
              
              <div className="mt-4 flex items-center justify-between text-[11px] text-gray-500 font-medium pt-3 border-t border-gray-100">
                <span>Issued by: <span className="text-gray-900 font-semibold">{selectedAnnouncement.sent_by}</span></span>
                <span>CTU Argao Campus</span>
              </div>
            </div>

            <div className="p-3.5 border-t border-gray-100 bg-gray-50/40 flex justify-end">
              <button 
                onClick={() => setSelectedAnnouncement(null)} 
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}