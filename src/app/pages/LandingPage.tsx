import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Database, MessageSquare, Award, FileSearch, Shield, Users, ArrowRight, CheckCircle, Sparkles, X } from "lucide-react";
import { apiClient } from "../api/client";

export function LandingPage() {
  // --- States ---
  const [isScrolled, setIsScrolled] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const [stats, setStats] = useState({
    documents: 0,
    queries: 0,
    helpfulAnswers: 0,
    users: 0,
    isLoading: true
  });

  // Track scrolling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Let keyboard users close either policy without having to find the close button.
  useEffect(() => {
    if (!isTermsOpen && !isPrivacyOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTermsOpen(false);
        setIsPrivacyOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTermsOpen, isPrivacyOpen]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get("/public-stats");
        setStats({
          documents: response.data.documents || 0,
          queries: response.data.queries || 0,
          helpfulAnswers: response.data.helpful_answers || 0,
          users: response.data.users || 0,
          isLoading: false
        });
      } catch (error) {
        console.error("Failed to fetch system stats:", error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };
    fetchStats();
  }, []);

  const features = [
    {
      icon: Database,
      title: "Knowledge Repository",
      description: "Store and manage all institutional policies, procedures, and documents in one secure, searchable location.",
      color: "#DD7230"
    },
    {
      icon: MessageSquare,
      title: "AI Policy Q&A",
      description: "Ask questions in natural language and receive instant, accurate answers with source citations from documents.",
      color: "#DD7230"
    },
    {
      icon: Award,
      title: "Accreditation Support",
      description: "Streamline accreditation processes with evidence locators, compliance checklists, and gap identification.",
      color: "#DD7230"
    },
    {
      icon: FileSearch,
      title: "Governance Reference",
      description: "Quick access to CHED memoranda, university policies, and regulatory frameworks with advanced search.",
      color: "#DD7230"
    },
    {
      icon: Shield,
      title: "Audit Trail",
      description: "Complete tracking of all system activities including queries, document access, and version changes.",
      color: "#DD7230"
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Secure access control with different permissions for administrators, faculty, and students.",
      color: "#DD7230"
    }
  ];

  const benefits = [
    "AI-powered intelligent search",
    "Secure document management",
    "Real-time compliance tracking",
    "Automated accreditation support"
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      {/* Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md transition-all duration-300 ${
          isScrolled 
            ? "bg-white/90 backdrop-blur-md shadow-sm border-b border-[#E5E7EB]" 
            : "md:bg-transparent md:backdrop-blur-none"
        }`}
      >
        <div 
          className={`container mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6 lg:px-8 ${
            isScrolled ? "py-3 sm:py-4" : "py-3 sm:py-5 lg:py-6"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center sm:h-11 sm:w-11">
              <img 
                src="/ctu-logo.png" 
                alt="CTU Logo" 
                className="h-8 w-8 object-contain" 
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-[#1F2937] sm:text-base">CTU Argao</div>
              <div className="hidden text-xs tracking-wide text-[#6B7280] sm:block">Knowledge System</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <Link 
              to="/login" 
              className="px-3 py-2 text-sm font-medium text-[#DD7230] transition-colors hover:text-[#c66224] sm:px-5 sm:py-2.5"
            >
              Sign In
            </Link>
            <Link 
              to="/signup" 
              className="rounded-full bg-[#DD7230] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#c66224] hover:shadow-md sm:px-6 sm:py-2.5"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pb-14 pt-28 sm:pb-16 sm:pt-36 lg:pb-20 lg:pt-40">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left Column */}
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-[#1F2937] sm:text-5xl md:text-6xl lg:text-7xl">
                  RAG-Powered
                  <br />
                  <span className="text-[#DD7230]">Knowledge</span>
                  <br />
                  System
                </h1>
              </div>

              <p className="max-w-xl text-base leading-relaxed text-[#6B7280] sm:text-lg md:text-xl">
                Empowering quality assurance and academic governance with intelligent 
                document management and AI-powered insights.
              </p>

              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 sm:items-center">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-50">
                      <CheckCircle className="h-4 w-4 text-[#10B981]" />
                    </div>
                    <span className="text-sm leading-6 text-[#1F2937] sm:text-base">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-4 sm:pt-4">
                <Link 
                  to="/signup" 
                  className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#DD7230] px-6 py-3.5 font-medium text-white shadow-md transition-all hover:bg-[#c66224] hover:shadow-lg sm:w-auto sm:rounded-2xl sm:px-8 sm:py-4"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  to="/login" 
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-[#E5E7EB] bg-white px-6 py-3.5 font-medium text-[#1F2937] transition-all hover:border-[#DD7230] hover:text-[#DD7230] sm:w-auto sm:rounded-2xl sm:px-8 sm:py-4"
                >
                  Sign in to System
                </Link>
              </div>

              <div className="flex flex-col items-start gap-2 pt-4 text-sm text-[#6B7280] sm:flex-row sm:items-center sm:gap-4 sm:pt-8">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Secure & Compliant</span>
                </div>
                <div className="hidden h-1 w-1 rounded-full bg-[#E5E7EB] sm:block"></div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Trusted by {stats.isLoading ? "..." : stats.users} Users</span>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="relative hidden lg:block">
              <div className="relative">
                  <div className="rounded-3xl overflow-hidden shadow-2xl">
                    <img 
                      src="/ctuac-bg.png" 
                      alt="CTU Knowledge System"
                      className="w-full h-[400px] lg:h-[600px] object-cover"
                    />
                  </div>

                <div className="absolute -bottom-8 -left-8 bg-white rounded-2xl shadow-xl p-6 border border-[#E5E7EB]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#FFF4E5] rounded-xl flex items-center justify-center">
                      <Database className="h-6 w-6 text-[#DD7230]" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#1F2937]">
                        {stats.isLoading ? "..." : stats.documents}
                      </div>
                      <div className="text-sm text-[#6B7280]">Documents</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -top-8 -right-8 bg-white rounded-2xl shadow-xl p-6 border border-[#E5E7EB]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-[#10B981]" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#1F2937]">
                        {stats.isLoading ? "..." : stats.queries}
                      </div>
                      <div className="text-sm text-[#6B7280]">Questions answered</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gradient-to-b from-white to-[#F5F7FA] py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 space-y-3 text-center sm:mb-14 sm:space-y-4 lg:mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl md:text-5xl">
              Everything You Need
            </h2>
            <p className="mx-auto max-w-2xl text-base text-[#6B7280] sm:text-lg">
              Comprehensive tools designed to streamline institutional knowledge management
            </p>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className="group rounded-2xl border border-[#E5E7EB] bg-white p-6 transition-all duration-300 hover:shadow-lg sm:p-7 lg:rounded-3xl lg:p-8 lg:hover:-translate-y-1 lg:hover:shadow-2xl"
                >
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <Icon className="h-7 w-7" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-[#1F2937]">
                    {feature.title}
                  </h3>
                  <p className="text-base text-[#6B7280] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-[#DD7230] px-5 py-10 sm:px-10 sm:py-12 lg:rounded-[3rem] lg:p-16">
            <div className="mb-9 text-center sm:mb-12">
              <h2 className="mb-3 text-2xl font-bold text-white sm:mb-4 sm:text-3xl md:text-4xl">
                Trusted by CTU Community
              </h2>
              <p className="mx-auto max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base md:text-lg">
                A shared workspace for faculty, staff, and students at CTU Argao Campus
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-8 sm:gap-y-10 lg:grid-cols-4 lg:gap-12">
              <div className="text-center">
                <div className="mb-1 text-3xl font-bold text-white sm:text-4xl md:text-5xl lg:mb-2 lg:text-6xl">
                  {stats.isLoading ? "-" : stats.documents}
                </div>
                <div className="text-sm leading-snug text-white/80 sm:text-base">Official documents</div>
              </div>
              <div className="text-center">
                <div className="mb-1 text-3xl font-bold text-white sm:text-4xl md:text-5xl lg:mb-2 lg:text-6xl">
                  {stats.isLoading ? "-" : stats.queries}
                </div>
                <div className="text-sm leading-snug text-white/80 sm:text-base">Questions answered</div>
              </div>
              <div className="text-center">
                <div className="mb-1 text-3xl font-bold text-white sm:text-4xl md:text-5xl lg:mb-2 lg:text-6xl">
                  {stats.isLoading ? "-" : stats.helpfulAnswers}
                </div>
                <div className="text-sm leading-snug text-white/80 sm:text-base">Helpful answers</div>
              </div>
              <div className="text-center">
                <div className="mb-1 text-3xl font-bold text-white sm:text-4xl md:text-5xl lg:mb-2 lg:text-6xl">
                  {stats.isLoading ? "-" : stats.users}
                </div>
                <div className="text-sm leading-snug text-white/80 sm:text-base">Community members</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[#F5F7FA] py-16 sm:py-20 lg:py-24">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-6 text-center sm:space-y-8">
            <h2 className="text-3xl font-bold tracking-tight text-[#1F2937] sm:text-4xl md:text-5xl">
              Ready to Transform Your
              <br className="hidden sm:block" />
              Knowledge Management?
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-[#6B7280] sm:text-lg md:text-xl">
              Join CTU Argao Campus in modernizing institutional knowledge management 
              with AI-powered solutions.
            </p>
            <div className="pt-2 sm:pt-4">
              <Link 
                to="/signup" 
                className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#DD7230] px-7 py-3.5 font-medium text-white shadow-lg transition-all hover:bg-[#c66224] hover:shadow-xl sm:w-auto sm:rounded-2xl sm:px-10 sm:py-5 sm:text-lg"
              >
                Get Started Today
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-10 sm:py-12">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:items-center md:flex-row">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 flex items-center justify-center">
                <img 
                  src="/ctu-logo.png" 
                  alt="CTU Logo" 
                  className="h-8 w-8 object-contain" 
                />
              </div>
              <div className="text-xs leading-relaxed text-[#6B7280] sm:text-sm">
                © 2026 Cebu Technological University - Argao Campus
              </div>
            </div>
            {/* FOOTER LINKS */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#6B7280] sm:gap-8">
              <button 
                onClick={() => setIsPrivacyOpen(true)} 
                className="hover:text-[#DD7230] transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => setIsTermsOpen(true)} 
                className="hover:text-[#DD7230] transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* --- MODALS --- */}
      
      {/* Terms of Service Modal */}
      {isTermsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="terms-title">
          <div className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[80vh] sm:rounded-2xl sm:border sm:border-[#E5E7EB]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] p-4 sm:p-6">
              <div>
                <h3 id="terms-title" className="text-lg font-bold text-[#1F2937] sm:text-xl">Terms of Service</h3>
                <p className="mt-1 text-xs text-[#6B7280]">Last updated: November 2, 2026</p>
              </div>
              <button onClick={() => setIsTermsOpen(false)} className="text-[#6B7280] hover:text-[#1F2937] transition-colors cursor-pointer">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-4 text-sm leading-relaxed text-[#4B5563] sm:space-y-6 sm:p-6 sm:text-base">
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">1. Acceptance and eligibility</h4>
                <p>These Terms govern your access to the CTU Argao Institutional Knowledge System (the “Service”), operated for authorized Cebu Technological University (CTU) Argao Campus users. By creating an account, signing in, or using the Service, you agree to these Terms and the Privacy Policy. If you do not agree, do not use the Service. You must provide accurate information and use the Service only if you are authorized by CTU or your campus role.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">2. Permitted use</h4>
                <p>You may use the Service for legitimate academic, administrative, quality-assurance, accreditation, and governance activities. You may not probe or bypass access controls; impersonate another person; upload malware or unlawful, confidential, or infringing material without authorization; scrape or overload the Service; interfere with its operation; disclose another person’s data; or use outputs to make decisions that require an authorized university process without human review.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">3. Accounts and security</h4>
                <p>Keep your credentials confidential, use a strong password, and promptly report suspected compromise or unauthorized activity to the campus system administrator. You are responsible for activity performed through your account, except where caused by the Service’s failure to apply reasonable safeguards or by circumstances you could not reasonably prevent.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">4. AI and institutional content</h4>
                <p>The Service uses retrieval-augmented AI to help locate and summarize institutional documents. AI responses can be incomplete, outdated, or wrong and are not official advice, grades, legal advice, or a substitute for a current CTU publication or authorized personnel. Verify important information before relying on it. Official documents, policies, and decisions remain controlled by CTU’s applicable offices and records systems.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">5. Your content and CTU rights</h4>
                <p>You retain rights in content you submit, subject to any rights CTU already has in institutional records. You grant CTU the limited rights needed to store, secure, process, display, audit, and back up that content to operate the Service and meet institutional obligations. Do not upload content unless you have authority to do so and it is appropriate for the intended audience and access level.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">6. Availability, suspension, and changes</h4>
                <p>We may change, suspend, or restrict the Service for maintenance, security, legal, or institutional reasons. CTU may suspend or disable accounts that violate these Terms, threaten security, or are no longer authorized, subject to applicable university process. We may update these Terms by posting a revised version with a new “Last updated” date. Continued use after an update means you accept the revised Terms.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">7. Disclaimers and limitation of liability</h4>
                <p>To the extent permitted by Philippine law, the Service is provided on an “as available” basis. CTU does not warrant that every AI response, document, link, or service interruption will be error-free or uninterrupted. Nothing in these Terms excludes liability that cannot lawfully be excluded, including liability under applicable data-protection law. Subject to that limit, CTU is not responsible for losses caused by unauthorized use of an account, reliance on unverified AI output, or content a user uploads or shares unlawfully.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">8. Governing law and contact</h4>
                <p>These Terms are governed by the laws of the Republic of the Philippines, subject to applicable university rules and procedures. Questions about the Service or these Terms may be sent to the CTU Argao Campus system administrator through the official campus support channel.</p>
              </section>
            </div>
            <div className="flex justify-end border-t border-[#E5E7EB] bg-gray-50 p-4 sm:p-6">
              <button 
                onClick={() => setIsTermsOpen(false)} 
                className="w-full cursor-pointer rounded-xl bg-[#DD7230] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#c66224] sm:w-auto"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {isPrivacyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
          <div className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[80vh] sm:rounded-2xl sm:border sm:border-[#E5E7EB]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] p-4 sm:p-6">
              <div>
                <h3 id="privacy-title" className="text-lg font-bold text-[#1F2937] sm:text-xl">Privacy Policy</h3>
                <p className="mt-1 text-xs text-[#6B7280]">Last updated: November 2, 2026</p>
              </div>
              <button onClick={() => setIsPrivacyOpen(false)} className="text-[#6B7280] hover:text-[#1F2937] transition-colors cursor-pointer">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-4 text-sm leading-relaxed text-[#4B5563] sm:space-y-6 sm:p-6 sm:text-base">
              <div className="rounded-xl border border-[#DD7230] bg-[#FFF4E5] p-4 text-sm font-medium text-[#8A421C]">
                This notice explains how the Service processes personal data under Republic Act No. 10173, the Data Privacy Act of 2012, and applicable National Privacy Commission guidance.
              </div>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">1. Who is responsible</h4>
                <p>Cebu Technological University – Argao Campus is the institutional owner and personal information controller for the campus Service. The campus system administrator coordinates operational requests. This notice applies to the public landing page and to the authenticated Service; a separate university notice may apply to other CTU systems.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">2. Data we process</h4>
                <p>Depending on how you use the Service, this may include your name, institutional or recovery email, role, department or office, course and year level, account status, verification data, password hash, and account timestamps; questions, chat history, feedback, and AI responses; documents, evidence, and other content you upload; audit records such as document access, actions, and administrative events; and technical information needed for security and operation, such as request, device, or network logs. We do not ask users to submit sensitive personal information unless the relevant CTU process authorizes it.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">3. Why we process it</h4>
                <p>We process data to create and authenticate accounts; assign role-based permissions; provide search, document management, AI assistance, audit, accreditation, and governance features; prevent fraud, abuse, and security incidents; maintain system integrity; respond to support and privacy requests; comply with law and university obligations; and produce limited operational or institutional analytics. Processing is based on the applicable lawful basis under the Data Privacy Act, including consent where required, contract or requested service, legal obligation, and legitimate institutional purposes.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">4. AI processing</h4>
                <p>Your prompts and relevant institutional documents may be processed to retrieve sources and generate a response. Queries and related activity may be retained in audit or chat history so authorized personnel can operate, secure, evaluate, and improve the Service. The Service is not a sole decision-maker for academic, employment, disciplinary, or other significant decisions. Do not enter information that is unnecessary for your question, especially another person’s sensitive information.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">5. Disclosure and service providers</h4>
                <p>Access is limited by role and operational need. Data may be disclosed to authorized CTU personnel, service providers that host or support the application or database, auditors and security providers, and government or law-enforcement authorities when required or permitted by law. We do not sell personal data or use it for third-party advertising. Service providers must handle data only for authorized purposes and with appropriate safeguards.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">6. Retention and security</h4>
                <p>We retain information only for as long as needed for the stated purposes, university records and audit requirements, security, dispute resolution, or legal claims. When no longer needed, it should be securely deleted, anonymized, or archived under applicable records rules. We use reasonable organizational, physical, and technical safeguards, including access controls, authentication protections, audit logging, rate limiting, and secure handling practices. No internet or storage system can be guaranteed completely secure; please report suspected incidents promptly.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">7. Your rights and requests</h4>
                <p>Subject to the Data Privacy Act and its exceptions, you may request to be informed, access or obtain a copy of your data, correct inaccurate data, object to or limit processing, request erasure or blocking, exercise data portability, and seek damages or file a complaint where applicable. Requests should identify the account and requested action and may require identity verification. Contact the CTU Argao Campus system administrator through the official campus support channel. You may also contact the National Privacy Commission through <a className="text-[#DD7230] underline" href="https://privacy.gov.ph/" target="_blank" rel="noreferrer">privacy.gov.ph</a>.</p>
              </section>
              <section>
                <h4 className="mb-2 text-base font-semibold text-[#1F2937] sm:text-lg">8. Updates and legal references</h4>
                <p>We may update this notice when processing changes or when law or official guidance changes. The current version and date will be posted here. For the primary legal references, see <a className="text-[#DD7230] underline" href="https://officialgazette.gov.ph/2012/15/republic-act-no-10173" target="_blank" rel="noreferrer">Republic Act No. 10173</a> and the <a className="text-[#DD7230] underline" href="https://privacy.gov.ph/the-data-privacy-act-and-its-irr/" target="_blank" rel="noreferrer">National Privacy Commission’s DPA and IRR resources</a>.</p>
              </section>
            </div>
            <div className="flex justify-end border-t border-[#E5E7EB] bg-gray-50 p-4 sm:p-6">
              <button 
                onClick={() => setIsPrivacyOpen(false)} 
                className="w-full cursor-pointer rounded-xl bg-[#DD7230] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#c66224] sm:w-auto"
              >
                Close Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
