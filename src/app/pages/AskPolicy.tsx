import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import {
  Send, Sparkles, FileText, ThumbsUp, ThumbsDown, ChevronDown,
  Loader2, RotateCcw, Lock, Copy, Check, Trash2, ArrowRight
} from "lucide-react";
import axios, { type CancelTokenSource } from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { apiClient } from "../api/client";
import { useRole } from "../contexts/RoleContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const MAX_QUESTION_LENGTH = 1000;

interface Source {
  name: string;
  relevance: number;
  snippet?: string;
}

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  sources?: Source[];
  timestamp: string;
  feedback?: "helpful" | "not-helpful";
  followUps?: string[];
  isError?: boolean;
  isRestricted?: boolean;
  failedQuestion?: string;
}

const nowLabel = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

let idCounter = 0;
const nextId = () => `msg_${Date.now()}_${idCounter++}`;

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  type: "ai",
  content:
    "Hello! I am your **CTU Policy Assistant**. Ask me anything regarding university manuals, student guidelines, academic policies, faculty procedures, and ISO standards.",
  timestamp: nowLabel(),
};

interface CategoryQuestions {
  category: string;
  fullTitle: string;
  questions: string[];
}

const CATEGORIZED_QUESTIONS: CategoryQuestions[] = [
  {
    category: "Attendance",
    fullTitle: "Attendance & Absences",
    questions: [
      "How many unexcused absences lead to a Dropped with Failure (D/F) grade?",
      "What documents are required to excuse an absence due to illness?",
      "What is the university policy on class tardiness and attendance percentage?",
      "Are students excused for official university and campus activities?",
    ],
  },
  {
    category: "Retention",
    fullTitle: "Academic Standing & Retention",
    questions: [
      "What are the retention requirements and rules on academic probation?",
      "What happens when a student receives a warning letter or fails subjects?",
      "What is the difference between Warning, Probation, and Disqualification status?",
      "Under what conditions can a student's academic load be reduced?",
    ],
  },
  {
    category: "Grading",
    fullTitle: "Grading System & Deficiencies",
    questions: [
      "What is the procedure and deadline for removal of an Incomplete (INC) grade?",
      "What is the grading scale and passing mark for undergraduate courses?",
      "How are midterm and computed semester grades calculated after absences?",
      "Can a student re-enroll in a subject after receiving a failing mark?",
    ],
  },
  {
    category: "Discipline",
    fullTitle: "Conduct & Student Life",
    questions: [
      "What are the rules regarding campus uniform, dress code, and student ID?",
      "What offenses are classified as major disciplinary violations in the handbook?",
      "What is the due process procedure for student grievances and disciplinary actions?",
      "What are the guidelines for student organizations, elections, and campus events?",
    ],
  },
  {
    category: "Governance",
    fullTitle: "Institutional Standards & ISO",
    questions: [
      "What are the official vision, mission, and quality objectives of CTU Argao?",
      "What are the responsibilities and academic code of conduct for faculty?",
      "What are the guidelines for student research, ethics, and intellectual property?",
      "What is the institutional policy on campus health and safety protocols?",
    ],
  },
];

const FLAT_SUGGESTIONS = CATEGORIZED_QUESTIONS.flatMap((c) => c.questions);

export function AskPolicy({ isWidget = false }: { isWidget?: boolean } = {}) {
  const { userRole } = useRole();
  const currentRole = userRole || "STUDENT";

  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelSourceRef = useRef<CancelTokenSource | null>(null);
  const isNearBottomRef = useRef(true);

  const userEmail = sessionStorage.getItem("userEmail");

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 120;
  };

  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (!userEmail) {
      setHistoryLoaded(true);
      return;
    }

    let cancelled = false;

    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_BASE}/chat-history`, {
          params: { email: userEmail },
        });

        if (cancelled) return;

        if (res.data && res.data.length > 0) {
          const formattedHistory: Message[] = res.data.map((msg: any) => ({
            id: msg.id ? `hist_${msg.id}` : nextId(),
            type: msg.role === "ai" ? "ai" : "user",
            content: msg.content ?? "",
            timestamp: msg.created_at
              ? new Date(msg.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : nowLabel(),
          }));

          setMessages([WELCOME_MESSAGE, ...formattedHistory]);
        }
      } catch (error) {
        console.error("Failed to load chat history", error);
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  const handleSendMessage = useCallback(
    async (quickText?: string) => {
      const textToSend = (typeof quickText === "string" ? quickText : query).trim();
      if (!textToSend || isLoading) return;

      if (textToSend.length > MAX_QUESTION_LENGTH) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            type: "ai",
            content: `Question exceeds the limit (${textToSend.length} characters). Please shorten it under ${MAX_QUESTION_LENGTH} characters.`,
            timestamp: nowLabel(),
            isError: true,
          },
        ]);
        return;
      }

      const userMessage: Message = {
        id: nextId(),
        type: "user",
        content: textToSend,
        timestamp: nowLabel(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setQuery("");
      setIsLoading(true);
      isNearBottomRef.current = true;

      cancelSourceRef.current?.cancel("New request superseded previous one");
      const source = axios.CancelToken.source();
      cancelSourceRef.current = source;

      try {
        const chatHistoryPayload = messages
          .filter((m) => !m.isError && m.id !== "welcome" && m.content)
          .slice(-6)
          .map((m) => ({
            role: m.type === "user" ? "user" : "assistant",
            content: m.content,
          }));

        const response = await apiClient.post(
          "/ask-policy",
          {
            question: textToSend,
            history: chatHistoryPayload,
            user_email: userEmail || "guest@ctu.edu.ph",
            user_role: currentRole,
          },
          { cancelToken: source.token, timeout: 45000 }
        );

        const formattedSources: Source[] = (response.data?.sources || []).map(
          (src: any) => ({
            name: src.name,
            snippet: src.snippet,
            relevance: src.relevance,
          })
        );

        const rawAnswer = response.data?.answer ?? "Unable to retrieve response. Please try again.";
        const cleanedAnswer = rawAnswer.replace(/\|FOLLOWUPS\|?[\s\S]*/i, "").trim();

        const aiMessage: Message = {
          id: nextId(),
          type: "ai",
          content: cleanedAnswer,
          sources: formattedSources.length > 0 ? formattedSources : undefined,
          followUps: response.data?.follow_ups,
          isRestricted: response.data?.restricted || false,
          timestamp: nowLabel(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {
        if (axios.isCancel(error)) return;

        const isTimeout = axios.isAxiosError(error) && error.code === "ECONNABORTED";
        const errorMessage: Message = {
          id: nextId(),
          type: "ai",
          content: isTimeout
            ? "Request timed out. Please try sending your question again."
            : "Could not connect to the policy knowledge service. Please check your connection and try again.",
          timestamp: nowLabel(),
          isError: true,
          failedQuestion: textToSend,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        textareaRef.current?.focus();
      }
    },
    [query, isLoading, userEmail, currentRole, messages]
  );

  const handleRetry = (failedQuestion?: string) => {
    if (failedQuestion) handleSendMessage(failedQuestion);
  };

  const handleClearChat = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  const handleCopyContent = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleFeedback = async (messageId: string, isHelpful: boolean) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const aiMessage = messages[messageIndex];
    const newFeedback = isHelpful ? "helpful" : "not-helpful";
    const finalFeedback = aiMessage.feedback === newFeedback ? undefined : newFeedback;

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, feedback: finalFeedback } : msg
      )
    );

    if (finalFeedback) {
      const userMessage = [...messages.slice(0, messageIndex)].reverse().find((m) => m.type === "user");
      if (!userMessage) return;

      try {
        await apiClient.post("/feedback", {
          question: userMessage.content,
          answer: aiMessage.content,
          is_helpful: isHelpful,
        });
      } catch (error) {
        console.error("Failed to submit feedback", error);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === "Escape") {
      setQuery("");
    }
  };

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const charCount = query.length;
  const isOverLimit = charCount > MAX_QUESTION_LENGTH;
  const isOnlyWelcome = messages.length === 1 && messages[0].id === "welcome";

  const chatContent = (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white">
      
      {/* Subheader */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-medium text-gray-700">Policy Knowledge Base</span>
        </div>
        
        {messages.length > 1 && (
          <button
            onClick={handleClearChat}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 hover:text-gray-900 rounded transition-colors cursor-pointer"
            title="Reset conversation"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* Messages Feed */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        className={`flex-1 overflow-y-auto ${isWidget ? "p-3 space-y-3" : "p-4 sm:p-5 space-y-3.5"} min-h-0 custom-scrollbar`}
      >
        {!historyLoaded && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}

        {/* Starter Prompts */}
        {isOnlyWelcome && !isWidget && (
          <div className="my-2 p-3.5 bg-gray-50/70 border border-gray-200 rounded-xl space-y-2.5">
            <p className="text-xs font-semibold text-gray-800">Suggested Inquiries</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FLAT_SUGGESTIONS.slice(0, 4).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => { setQuery(suggestion); textareaRef.current?.focus(); }}
                  className="text-left p-2.5 rounded-lg bg-white border border-gray-200 hover:border-[#DD7230] text-xs text-gray-700 transition-colors cursor-pointer shadow-2xs leading-snug"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[90%] sm:max-w-[85%] flex flex-col ${message.type === "user" ? "items-end" : "items-start"}`}>
              {message.type === "ai" && (
                <div className="flex items-center gap-1.5 mb-1 shrink-0">
                  <span className="text-xs font-medium text-gray-700">
                    {message.isError
                      ? "System Notice"
                      : message.isRestricted
                      ? "Restricted Access"
                      : "Policy Assistant"}
                  </span>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  message.type === "user"
                    ? "bg-[#DD7230] text-white rounded-tr-xs shadow-2xs font-normal"
                    : message.isError
                    ? "bg-rose-50 text-rose-800 border border-rose-200 rounded-tl-xs"
                    : message.isRestricted
                    ? "bg-amber-50 text-amber-900 border border-amber-200 rounded-tl-xs"
                    : "bg-gray-50 text-gray-800 border border-gray-200 rounded-tl-xs shadow-2xs"
                }`}
              >
                {message.type === "user" ? (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none break-words text-gray-800 leading-relaxed text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_li]:my-1 [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:border [&_table]:border-gray-200 [&_table]:rounded-xl [&_table]:overflow-hidden [&_th]:border [&_th]:border-gray-200 [&_th]:p-2.5 [&_th]:bg-[#FFF4E5] [&_th]:text-[#DD7230] [&_th]:font-bold [&_td]:border [&_td]:border-gray-200 [&_td]:p-2.5 [&_strong]:font-bold [&_strong]:text-gray-900 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mt-2.5 [&_h3]:mb-1 [&_blockquote]:border-l-4 [&_blockquote]:border-[#DD7230] [&_blockquote]:pl-3 [&_blockquote]:py-1 [&_blockquote]:my-2 [&_blockquote]:bg-[#FFF4E5]/40 [&_blockquote]:text-gray-700 [&_code]:bg-gray-100 [&_code]:text-[#DD7230] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {/* Error Retry CTA */}
              {message.isError && message.failedQuestion && (
                <button
                  onClick={() => handleRetry(message.failedQuestion)}
                  disabled={isLoading}
                  className="mt-1.5 flex items-center gap-1 px-2.5 py-1 text-xs text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" /> Retry
                </button>
              )}

              {/* Citations */}
              {message.type === "ai" && message.sources && message.sources.length > 0 && (
                <div className="mt-2.5 w-full space-y-1.5">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Sources ({message.sources.length})
                  </p>
                  {message.sources.map((source) => (
                    <details
                      key={`${message.id}_${source.name}`}
                      className="group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs"
                    >
                      <summary className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 transition-colors list-none">
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span
                            className="text-xs text-gray-700 truncate"
                            title={source.name}
                          >
                            {source.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-gray-500">
                            {source.relevance}% match
                          </span>
                          <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-open:rotate-180 transition-transform duration-200" />
                        </div>
                      </summary>
                      {source.snippet && (
                        <div className="p-2.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 italic">
                          "{source.snippet}"
                        </div>
                      )}
                    </details>
                  ))}
                </div>
              )}

              {/* Action Bar */}
              {message.type === "ai" && !message.isError && (
                <div className="flex items-center gap-2.5 mt-1 pl-0.5">
                  <span className="text-[10px] text-gray-400">{message.timestamp}</span>
                  
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleCopyContent(message.id, message.content)}
                      className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors cursor-pointer"
                      title="Copy response"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleFeedback(message.id, true)}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        message.feedback === "helpful"
                          ? "text-emerald-600"
                          : "text-gray-400 hover:text-gray-700"
                      }`}
                      title="Helpful"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    
                    <button
                      onClick={() => handleFeedback(message.id, false)}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        message.feedback === "not-helpful"
                          ? "text-rose-600"
                          : "text-gray-400 hover:text-gray-700"
                      }`}
                      title="Not helpful"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Follow-up Chips */}
              {message.type === "ai" && message.followUps && message.followUps.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {message.followUps.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(question)}
                      disabled={isLoading}
                      className="text-left text-xs bg-white text-gray-700 border border-gray-200 hover:border-[#DD7230] px-2.5 py-1 rounded-full transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-xs px-3.5 py-2 bg-gray-50 border border-gray-200 flex items-center gap-2 shadow-2xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#DD7230]" />
              <p className="text-xs text-gray-500">Searching knowledge base...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Chips for Widget */}
      {isWidget && (
        <div className="shrink-0 px-3 py-1.5 bg-gray-50 border-t border-gray-200 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {FLAT_SUGGESTIONS.slice(0, 3).map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => { setQuery(suggestion); textareaRef.current?.focus(); }}
              className="whitespace-nowrap px-2.5 py-0.5 text-xs text-gray-700 bg-white border border-gray-200 hover:border-[#DD7230] rounded-full shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input Panel */}
      <div className={`shrink-0 border-t border-gray-200 ${isWidget ? "p-2.5" : "p-3 sm:p-3.5"} bg-white`}>
        <div className="flex gap-2 items-end">
          <div className="flex-1 flex flex-col">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                autoGrow(e.target);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask a policy, syllabus, grading, or ISO question..."
              disabled={isLoading}
              maxLength={MAX_QUESTION_LENGTH + 50}
              className={`w-full px-3 py-2 bg-gray-50/50 border rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all resize-none min-h-[38px] max-h-[120px] disabled:opacity-60 disabled:cursor-not-allowed ${
                isOverLimit
                  ? "border-rose-300 focus:ring-rose-500"
                  : "border-gray-200 focus:ring-[#DD7230]"
              }`}
              rows={1}
            />
            {charCount > MAX_QUESTION_LENGTH * 0.8 && (
              <span
                className={`text-[10px] mt-1 ml-1 ${
                  isOverLimit ? "text-rose-600 font-medium" : "text-gray-400"
                }`}
              >
                {charCount}/{MAX_QUESTION_LENGTH}
              </span>
            )}
          </div>
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !query.trim() || isOverLimit}
            aria-label="Send question"
            className="p-2 bg-[#DD7230] text-white rounded-xl hover:bg-[#DD7230] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-[38px] w-[38px] shrink-0 active:scale-95 shadow-2xs cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (isWidget) {
    return (
      <div className="h-full flex flex-col min-h-0 bg-white overflow-hidden">
        {chatContent}
      </div>
    );
  }

  const activeCategory = CATEGORIZED_QUESTIONS[selectedCategoryTab];

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-6.5rem)] relative pb-2">
      {/* Header */}
      <div className="flex-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Policy Assistant</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Knowledge retrieval for CTU manuals, academic policies, and ISO procedures
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
              RAG Active
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Card Workspace */}
      <div className="flex-1 flex flex-row min-h-0 bg-white overflow-hidden rounded-xl border border-gray-200 shadow-2xs">
        {chatContent}

        {/* Right Side: Topics Sidebar */}
        <div className="hidden lg:flex flex-col w-80 bg-gray-50/40 border-l border-gray-200 p-4 shrink-0 overflow-hidden">
          <h3 className="text-xs font-semibold text-gray-900 mb-1">
            Topic Guide
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Select a category to view common policy questions:
          </p>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 mb-3 shrink-0">
            {CATEGORIZED_QUESTIONS.map((cat, idx) => (
              <button
                key={cat.category}
                onClick={() => setSelectedCategoryTab(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategoryTab === idx
                    ? "bg-[#DD7230] text-white shadow-2xs"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {cat.category}
              </button>
            ))}
          </div>

          {/* Active Category Heading */}
          <div className="mb-2 px-0.5">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              {activeCategory.fullTitle}
            </span>
          </div>

          {/* Questions List */}
          <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-0.5">
            {activeCategory.questions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => { setQuery(suggestion); textareaRef.current?.focus(); }}
                className="w-full text-left p-2.5 rounded-lg border border-gray-200 bg-white hover:border-[#DD7230] hover:bg-[#FFF4E5]/30 transition-colors text-xs text-gray-700 cursor-pointer shadow-2xs leading-snug"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}