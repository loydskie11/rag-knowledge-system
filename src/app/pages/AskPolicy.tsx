import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { Send, Sparkles, FileText, ThumbsUp, ThumbsDown, ChevronDown, Loader2, RotateCcw, AlertTriangle, Lock } from "lucide-react";
import axios, { type CancelTokenSource } from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRole } from "../contexts/RoleContext";

// Centralize the API origin instead of hardcoding localhost in every call —
// this alone was going to break the first time anyone deployed the frontend.
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
  failedQuestion?: string; // lets the "Retry" action resend the exact text that failed
}

const nowLabel = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Simple, collision-safe id generator. `messages.length + 1` in the original
// breaks the moment messages are ever removed/reordered, and gets worse once
// two responses can be in flight (double-send). A counter tied to a ref is cheap
// and stable across renders.
let idCounter = 0;
const nextId = () => `msg_${Date.now()}_${idCounter++}`;

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  type: "ai",
  content:
    "Hello! I'm your friendly AI Policy Assistant. Ask me anything about institutional policies, procedures, and guidelines. I'll provide accurate answers with source citations.",
  timestamp: nowLabel(),
};

const SUGGESTED_QUESTIONS = [
  "What are the requirements for enrollment?",
  "How do I apply for a scholarship?",
  "What is the campus dress code policy?",
  "How do I request a leave of absence?",
  "What is the standard grading system?",
  "What are the guidelines for student organizations?"
];

export function AskPolicy({ isWidget = false }: { isWidget?: boolean } = {}) {
  const { userRole } = useRole();
  const currentRole = userRole || "STUDENT";

  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cancelSourceRef = useRef<CancelTokenSource | null>(null);
  const isNearBottomRef = useRef(true);

  // sessionStorage can legitimately be empty/absent — treat that as "not signed in"
  // rather than silently emailing a fake guest address to the backend.
  const userEmail = sessionStorage.getItem("userEmail");

  // ── Smart autoscroll ──────────────────────────────────────────────
  // Only force-scroll to the bottom if the user was already near the bottom.
  // Otherwise, someone scrolling up to reread an earlier answer gets yanked
  // back down every time a new message streams in — a common chat-UI complaint.
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

  // ── Load history ──────────────────────────────────────────────────
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
        // Non-fatal — the assistant still works without prior history,
        // so we don't block the UI or show a scary error for this.
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  // ── Send ──────────────────────────────────────────────────────────
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
            content: `That question is a bit long (${textToSend.length} characters). Please shorten it to under ${MAX_QUESTION_LENGTH} characters and try again.`,
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

      // Cancel any previous in-flight request so a slow first answer can't
      // land after a faster second one and clobber the conversation order.
      cancelSourceRef.current?.cancel("New request superseded the previous one");
      const source = axios.CancelToken.source();
      cancelSourceRef.current = source;

      try {
        // Prepare recent chat history for multi-turn conversational context
        const chatHistoryPayload = messages
          .filter((m) => !m.isError && m.id !== "welcome" && m.content)
          .slice(-6)
          .map((m) => ({
            role: m.type === "user" ? "user" : "assistant",
            content: m.content,
          }));

        const response = await axios.post(
          `${API_BASE}/ask-policy`,
          {
            question: textToSend,
            history: chatHistoryPayload,
            user_email: userEmail || "guest@ctu.edu.ph",
            user_role: currentRole,
          },
          { cancelToken: source.token, timeout: 30000 }
        );

        const formattedSources: Source[] = (response.data?.sources || []).map(
          (src: any) => ({
            name: src.name,
            snippet: src.snippet,
            relevance: src.relevance,
          })
        );

        const rawAnswer = response.data?.answer ?? "I didn't get a usable response — please try again.";
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
        if (axios.isCancel(error)) return; // superseded — don't show an error for this

        const isTimeout = axios.isAxiosError(error) && error.code === "ECONNABORTED";
        const errorMessage: Message = {
          id: nextId(),
          type: "ai",
          content: isTimeout
            ? "That request took too long to answer. Please try again."
            : "Sorry, I had trouble connecting to the AI service. Please check your connection and try again.",
          timestamp: nowLabel(),
          isError: true,
          failedQuestion: textToSend,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
        // Return focus to the input so keyboard users can immediately ask a follow-up.
        textareaRef.current?.focus();
      }
    },
    [query, isLoading, userEmail, currentRole]
  );

  const handleRetry = (failedQuestion?: string) => {
    if (failedQuestion) handleSendMessage(failedQuestion);
  };

  // ── Feedback ──────────────────────────────────────────────────────
  const handleFeedback = async (messageId: string, isHelpful: boolean) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const aiMessage = messages[messageIndex];
    const newFeedback = isHelpful ? "helpful" : "not-helpful";
    
    // Toggle off if clicking the currently active button
    const finalFeedback = aiMessage.feedback === newFeedback ? undefined : newFeedback;

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, feedback: finalFeedback } : msg
      )
    );

    // Only fire the API request if we are setting a new feedback
    if (finalFeedback) {
      const userMessage = [...messages.slice(0, messageIndex)].reverse().find((m) => m.type === "user");
      if (!userMessage) return;

      try {
        await axios.post(`${API_BASE}/feedback`, {
          question: userMessage.content,
          answer: aiMessage.content,
          is_helpful: isHelpful,
        });
      } catch (error) {
        console.error("Failed to submit feedback", error);
      }
    }
  };

  // ── Input handling ───────────────────────────────────────────────
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // `nativeEvent.isComposing` guards against sending mid-keystroke while
    // composing IME input (Chinese/Japanese/Korean) — onKeyPress in the
    // original would fire Send on the Enter that confirms a character.
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

  const chatContent = (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      {/* Messages Feed Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="Conversation with AI Policy Assistant"
        className={`flex-1 overflow-y-auto ${isWidget ? "p-3 space-y-3.5" : "p-5 space-y-4"} min-h-0 custom-scrollbar`}
      >
        {!historyLoaded && (
          <div className="flex justify-center py-6" aria-hidden="true">
            <Loader2 className="h-4 w-4 animate-spin text-[#FF9501]" />
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[88%] flex flex-col items-start">
              {message.type === "ai" && (
                <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center ${
                      message.isError
                        ? "bg-rose-500"
                        : message.isRestricted
                        ? "bg-amber-600"
                        : "bg-[#FF9501]"
                    }`}
                  >
                    {message.isError ? (
                      <AlertTriangle className="h-3 w-3 text-white" />
                    ) : message.isRestricted ? (
                      <Lock className="h-3 w-3 text-white" />
                    ) : (
                      <Sparkles className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-900">
                    {message.isError
                      ? "Connection Issue"
                      : message.isRestricted
                      ? "Access Restricted"
                      : "AI Assistant"}
                  </span>
                </div>
              )}

              <div
                className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  message.type === "user"
                    ? "bg-[#FF9501] text-white rounded-tr-xs shadow-2xs self-end font-normal"
                    : message.isError
                    ? "bg-rose-50 text-rose-800 border border-rose-200 rounded-tl-xs shadow-2xs"
                    : message.isRestricted
                    ? "bg-orange-50 text-amber-900 border border-[#FF9501]/30 rounded-tl-xs shadow-2xs"
                    : "bg-gray-50/70 text-gray-800 border border-gray-200/80 rounded-tl-xs shadow-2xs"
                }`}
              >
                {message.type === "user" ? (
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                ) : (
                  <div className="prose prose-xs max-w-none break-words text-gray-800 leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_li]:my-1 [&_li]:leading-normal [&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-gray-200 [&_th]:p-1.5 [&_th]:bg-gray-100 [&_td]:border [&_td]:border-gray-200 [&_td]:p-1.5 [&_strong]:font-semibold [&_strong]:text-gray-900">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {message.isError && message.failedQuestion && (
                <button
                  onClick={() => handleRetry(message.failedQuestion)}
                  disabled={isLoading}
                  className="mt-1.5 flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="h-3 w-3" /> Retry
                </button>
              )}

              {/* Sources & Citations */}
              {message.type === "ai" && message.sources && message.sources.length > 0 && (
                <div className="mt-2.5 w-full space-y-1.5 pl-0.5">
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                    Sources & Citations
                  </p>
                  {message.sources.map((source) => (
                    <details
                      key={`${message.id}_${source.name}`}
                      className="group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs"
                    >
                      <summary className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-gray-50 transition-colors list-none">
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                          <FileText className="h-3.5 w-3.5 text-[#FF9501] shrink-0" />
                          <span
                            className={`text-xs font-medium text-gray-700 truncate ${isWidget ? 'max-w-[180px] sm:max-w-[200px]' : 'flex-1 max-w-[480px]'}`}
                            title={source.name}
                          >
                            {source.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <div className="w-20 bg-gray-100 rounded-full h-1 overflow-hidden hidden xs:block">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  source.relevance >= 80
                                    ? "bg-emerald-500"
                                    : source.relevance >= 60
                                    ? "bg-[#FF9501]"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, source.relevance))}%` }}
                              />
                            </div>
                            <span
                              className={`text-[10px] font-semibold min-w-[24px] text-right ${
                                source.relevance >= 80
                                  ? "text-emerald-600"
                                  : source.relevance >= 60
                                  ? "text-[#D97E00]"
                                  : "text-rose-600"
                              }`}
                            >
                              {source.relevance}%
                            </span>
                          </div>
                          <ChevronDown className="h-3 w-3 text-gray-400 group-open:rotate-180 transition-transform duration-200" />
                        </div>
                      </summary>
                      {source.snippet && (
                        <div className="p-2.5 bg-gray-50 border-t border-gray-200 text-[11px] text-gray-600 leading-relaxed italic">
                          "{source.snippet}"
                        </div>
                      )}
                    </details>
                  ))}
                </div>
              )}

              {/* Feedback Actions */}
              {message.type === "ai" && !message.isError && (
                <div className="flex items-center gap-2.5 mt-1.5 pl-0.5">
                  <span className="text-[10px] text-gray-400 font-normal">{message.timestamp}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleFeedback(message.id, true)}
                      className={`p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer ${
                        message.feedback === "helpful"
                          ? "text-emerald-600 bg-emerald-50"
                          : "text-gray-400 hover:text-gray-700"
                      }`}
                      title="Helpful"
                      aria-label="Mark as helpful"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleFeedback(message.id, false)}
                      className={`p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer ${
                        message.feedback === "not-helpful"
                          ? "text-rose-600 bg-rose-50"
                          : "text-gray-400 hover:text-gray-700"
                      }`}
                      title="Not helpful"
                      aria-label="Mark as not helpful"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Follow-up Question Chips */}
              {message.type === "ai" && message.followUps && message.followUps.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 pl-0.5">
                  {message.followUps.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(question)}
                      disabled={isLoading}
                      className="text-left text-xs bg-white text-[#D97E00] border border-[#FF9501]/30 hover:bg-orange-50/40 hover:border-[#FF9501] px-3 py-1 rounded-full transition-all shadow-2xs font-medium disabled:opacity-50 cursor-pointer"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Floating widget welcome cards */}
        {isWidget && messages.length <= 1 && (
          <div className="pt-2 space-y-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Suggested Topics:</p>
            <div className="grid grid-cols-1 gap-1.5">
              {SUGGESTED_QUESTIONS.slice(0, 3).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => { setQuery(suggestion); textareaRef.current?.focus(); }}
                  className="text-left px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/60 hover:border-[#FF9501] hover:bg-orange-50/20 text-xs font-medium text-gray-700 transition-colors cursor-pointer shadow-2xs"
                >
                  💡 {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start animate-in fade-in" aria-hidden="true">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-5 h-5 bg-[#FF9501] rounded-md flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white animate-pulse" />
                </div>
                <span className="text-xs font-semibold text-gray-900">AI Assistant</span>
              </div>
              <div className="rounded-2xl rounded-tl-xs px-3.5 py-2 bg-gray-50/70 border border-gray-200 flex items-center gap-2 shadow-2xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF9501]" />
                <p className="text-xs text-gray-500 font-medium">Searching knowledge base...</p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Horizontal Chips for Floating Widget */}
      {isWidget && (
        <div className="shrink-0 px-3 py-2 bg-gray-50/60 border-t border-gray-200 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          <span className="text-[9px] font-semibold text-[#D97E00] uppercase tracking-wider shrink-0">💡 Suggestions:</span>
          {SUGGESTED_QUESTIONS.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => { setQuery(suggestion); textareaRef.current?.focus(); }}
              className="whitespace-nowrap px-2.5 py-0.5 text-[11px] font-medium bg-white border border-gray-200 hover:border-[#FF9501] hover:text-[#D97E00] text-gray-700 rounded-full shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input Panel */}
      <div className={`shrink-0 border-t border-gray-200 ${isWidget ? "p-2.5" : "p-3.5"} bg-white`}>
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
              placeholder="Ask a policy question..."
              disabled={isLoading}
              aria-label="Ask a policy question"
              aria-invalid={isOverLimit}
              maxLength={MAX_QUESTION_LENGTH + 50}
              className={`w-full px-3 py-2 bg-gray-50/50 border rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:bg-white transition-all resize-none min-h-[36px] max-h-[120px] disabled:opacity-60 disabled:cursor-not-allowed ${
                isOverLimit
                  ? "border-rose-300 focus:ring-rose-500"
                  : "border-gray-200 focus:ring-[#FF9501]"
              }`}
              rows={1}
            />
            {charCount > MAX_QUESTION_LENGTH * 0.8 && (
              <span
                className={`text-[10px] mt-1 ml-1 ${
                  isOverLimit ? "text-rose-600 font-semibold" : "text-gray-400"
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
            className="p-2 bg-[#FF9501] text-white rounded-xl hover:bg-[#D97E00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center h-[36px] w-[36px] shrink-0 active:scale-95 shadow-2xs cursor-pointer"
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

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)] relative">
      {/* Header */}
      <div className="flex-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Policy Assistant</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Your intelligent guide to institutional rules, student guidelines, and campus procedures
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-2xs text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Online • RAG Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Card Workspace */}
      <div className="flex-1 flex flex-row min-h-0 bg-white overflow-hidden rounded-xl border border-gray-200 shadow-2xs">
        {chatContent}

        {/* Right Side: Suggested Topics Sidebar */}
        <div className="hidden lg:flex flex-col w-80 bg-gray-50/50 border-l border-gray-200 p-4">
          <h3 className="text-xs font-semibold text-gray-900 mb-0.5">
            Suggested Questions
          </h3>
          <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
            Click on any topic to automatically load and ask the AI assistant.
          </p>
          <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-0.5">
            {SUGGESTED_QUESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => { setQuery(suggestion); textareaRef.current?.focus(); }}
                className="w-full text-left p-2.5 rounded-lg border border-gray-200 bg-white hover:border-[#FF9501] hover:bg-orange-50/20 transition-colors text-xs font-medium text-gray-700 cursor-pointer shadow-2xs"
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