"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, User, Sparkles, RotateCcw, ArrowUp, MonitorPlay, ImagePlus, X, Camera, Mic, Settings, ArrowRight, LogOut, CreditCard } from "lucide-react";
import { ChatMessage, TutorResponse, ExamLevel, ExamBoard } from "@/types";
import type { WhiteboardResponse } from "@/types/whiteboard";
import EquationChain from "./EquationChain";
import WhiteboardRenderer from "./whiteboard/WhiteboardRenderer";
import WhiteboardTutor from "./WhiteboardTutor";
import InlineMath from "./InlineMath";
import AuthModal from "./AuthModal";
import PaywallModal from "./PaywallModal";
import PricingModal from "./PricingModal";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const ANON_PROMPT_KEY = "mathrix_anon_prompts";
const FREE_DAILY_LIMIT = 5;

/* ─────────────────────────────────────────────────────── */
/*  Intro slides — matches mathrix.co.uk boot animation   */
/* ─────────────────────────────────────────────────────── */
const INTRO_SLIDES = [
  {
    emoji: "🧮",
    title: "Welcome to the System",
    sub: "GCSE Maths. Step by step. Higher Tier.",
  },
  {
    emoji: "📊",
    title: "Choose Your Topic",
    sub: "Number, Algebra, Geometry, Ratio & Proportion, Statistics.\nAll mapped to GCSE Higher Tier.",
  },
];

function IntroOverlay({ onDone }: { onDone: () => void }) {
  const [slide, setSlide] = useState(0);

  const next = () => {
    if (slide < INTRO_SLIDES.length - 1) setSlide(slide + 1);
    else onDone();
  };

  const current = INTRO_SLIDES[slide];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(16,185,129,0.06) 0%, transparent 70%)",
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.45 }}
          className="flex flex-col items-center text-center z-10 px-6"
        >
          <span className="text-5xl mb-6">{current.emoji}</span>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{current.title}</h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-md whitespace-pre-line leading-relaxed">
            {current.sub}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Buttons */}
      <div className="absolute bottom-12 flex items-center gap-4 z-10">
        <button
          onClick={next}
          className="px-8 py-3 rounded-full font-semibold text-sm text-white transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #059669, #10b981)",
            boxShadow: "0 4px 24px rgba(5,150,105,0.25)",
          }}
        >
          {slide < INTRO_SLIDES.length - 1 ? "Next" : "Get Started"}
        </button>
        <button
          onClick={onDone}
          className="px-6 py-3 rounded-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip intro
        </button>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Main ChatInterface                                     */
/* ─────────────────────────────────────────────────────── */
export default function ChatInterface() {
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [level] = useState<ExamLevel>("GCSE");
  const [examBoard] = useState<ExamBoard>("AQA");
  const [selectedSubject] = useState("");
  const [whiteboardData, setWhiteboardData] = useState<WhiteboardResponse | null>(null);
  const [whiteboardResponses, setWhiteboardResponses] = useState<Map<string, WhiteboardResponse>>(new Map());
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth + usage state
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("free");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [promptsUsed, setPromptsUsed] = useState(0);
  const [pendingSendText, setPendingSendText] = useState<string | undefined>();
  const [showPricing, setShowPricing] = useState(false);

  const supabase = createClient();

  const isHero = messages.length === 0 && !loading;

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUsage();
      }
    });

    // Check initial session
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      if (u) fetchUsage();
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = await res.json();
        setPromptsUsed(data.promptsUsed);
        setSubscriptionStatus(data.subscriptionStatus);
      }
    } catch { /* ignore */ }
  };

  const getAnonPromptCount = (): number => {
    try {
      const stored = localStorage.getItem(ANON_PROMPT_KEY);
      if (!stored) return 0;
      const parsed = JSON.parse(stored);
      const today = new Date().toISOString().split("T")[0];
      if (parsed.date !== today) return 0;
      return parsed.count || 0;
    } catch { return 0; }
  };

  const incrementAnonPromptCount = () => {
    const today = new Date().toISOString().split("T")[0];
    const current = getAnonPromptCount();
    localStorage.setItem(ANON_PROMPT_KEY, JSON.stringify({ date: today, count: current + 1 }));
  };

  /** Convert selected file to base64 data URI */
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be under 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    if (!content && !pendingImage) return;
    if (loading) return;

    // ── Auth / usage gating ──────────────────────────────
    if (!user) {
      // Anonymous user: allow 1 prompt, then require sign-up
      const anonCount = getAnonPromptCount();
      if (anonCount >= 1) {
        setPendingSendText(content);
        setShowAuthModal(true);
        return;
      }
    } else if (subscriptionStatus !== "pro") {
      // Free user: check daily limit
      if (promptsUsed >= FREE_DAILY_LIMIT) {
        setShowPaywall(true);
        return;
      }
    }

    const imageUrl = pendingImage || undefined;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: content || (imageUrl ? "Solve this question from the photo" : ""),
      imageUrl,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingImage(null);
    setLoading(true);

    try {
      const history = [
        ...messages.map((m) => ({ role: m.role, content: m.content, imageUrl: m.imageUrl })),
        { role: "user", content: userMsg.content, imageUrl: userMsg.imageUrl },
      ];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, level, examBoard, subject: selectedSubject }),
      });

      const data = await res.json();

      if (res.status === 403 && data.error === "limit_reached") {
        setShowPaywall(true);
        // Remove optimistic user message
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return;
      }
      if (res.status === 401 && data.error === "auth_required") {
        setShowAuthModal(true);
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
        return;
      }
      if (!res.ok) throw new Error(data.error || "Request failed");

      // Track anonymous usage
      if (!user) {
        incrementAnonPromptCount();
      } else {
        setPromptsUsed((prev) => prev + 1);
      }

      const msgId = crypto.randomUUID();

      if (data.whiteboard) {
        setWhiteboardResponses((prev) => {
          const next = new Map(prev);
          next.set(msgId, data.whiteboard as WhiteboardResponse);
          return next;
        });
      }

      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          role: "assistant",
          content: JSON.stringify(data.response),
          parsed: data.response as TutorResponse,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "",
          parsed: {
            type: "explanation",
            intro: "Sorry, something went wrong. Please check your API key and try again.",
            steps: [],
            conclusion: "",
          },
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSubscriptionStatus("free");
    setPromptsUsed(0);
    setMessages([]);
  };

  const handleManageSubscription = async () => {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* ignore */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white relative">
      {/* ── Intro overlay ─────────────────────────────────── */}
      <AnimatePresence>
        {showIntro && <IntroOverlay onDone={() => setShowIntro(false)} />}
      </AnimatePresence>

      {/* ── Auth Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            onClose={() => { setShowAuthModal(false); setPendingSendText(undefined); }}
            onAuthenticated={() => {
              setShowAuthModal(false);
              fetchUsage();
              // Re-attempt the blocked send after auth
              if (pendingSendText) {
                const t = pendingSendText;
                setPendingSendText(undefined);
                setTimeout(() => sendMessage(t), 300);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Paywall Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showPaywall && (
          <PaywallModal onClose={() => setShowPaywall(false)} />
        )}
      </AnimatePresence>

      {/* ── Pricing Modal ──────────────────────────────────── */}
      <AnimatePresence>
        {showPricing && (
          <PricingModal
            onClose={() => setShowPricing(false)}
            onUpgrade={() => { setShowPricing(false); setShowAuthModal(true); }}
            isLoggedIn={!!user}
            currentPlan={subscriptionStatus}
          />
        )}
      </AnimatePresence>

      {/* ── Top bar ───────────────────────────────────────── */}
      <header className="flex items-center justify-end px-5 py-3 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RotateCcw size={13} /> New chat
            </button>
          )}
          <button
            onClick={() => setShowPricing(true)}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
          >
            Pricing
          </button>
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <Settings size={18} />
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              {subscriptionStatus === "pro" && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">PRO</span>
              )}
              {subscriptionStatus === "pro" && (
                <button
                  onClick={handleManageSubscription}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Manage subscription"
                >
                  <CreditCard size={16} />
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {(user.user_metadata?.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-sm font-medium px-4 py-1.5 rounded-full text-white transition-colors"
              style={{ background: "#2563eb" }}
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* ── Hero / Chat area ──────────────────────────────── */}
      {isHero ? (
        <HeroLanding
          input={input}
          setInput={setInput}
          loading={loading}
          pendingImage={pendingImage}
          setPendingImage={setPendingImage}
          fileInputRef={fileInputRef}
          inputRef={inputRef}
          handleImageSelect={handleImageSelect}
          handleKeyDown={handleKeyDown}
          sendMessage={sendMessage}
        />
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
            <AnimatePresence>
              {messages.map((msg) => {
                const wbr = whiteboardResponses.get(msg.id);
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    whiteboardResponse={wbr}
                    onWatchWhiteboard={wbr ? () => setWhiteboardData(wbr) : undefined}
                  />
                );
              })}
            </AnimatePresence>
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Chat input bar */}
          <ChatInputBar
            input={input}
            setInput={setInput}
            loading={loading}
            pendingImage={pendingImage}
            setPendingImage={setPendingImage}
            fileInputRef={fileInputRef}
            inputRef={inputRef}
            handleImageSelect={handleImageSelect}
            handleKeyDown={handleKeyDown}
            sendMessage={sendMessage}
          />
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* ── Whiteboard overlay ─────────────────────────────── */}
      <AnimatePresence>
        {whiteboardData && (
          <WhiteboardTutor data={whiteboardData} onClose={() => setWhiteboardData(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Hero Landing — matches mathrix.co.uk main page         */
/* ─────────────────────────────────────────────────────── */
interface InputProps {
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  pendingImage: string | null;
  setPendingImage: (v: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  sendMessage: (text?: string) => void;
}

function HeroLanding(props: InputProps) {
  const {
    input, setInput, loading, pendingImage, setPendingImage,
    fileInputRef, inputRef, handleKeyDown, sendMessage,
  } = props;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
      {/* Subtle top gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, #f3f4f6 0%, #ffffff 35%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center text-center z-10 w-full max-w-2xl"
      >
        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3 tracking-tight leading-tight whitespace-nowrap">
          GCSE Maths. Step by step.
        </h1>
        <p className="text-gray-400 text-base sm:text-lg mb-10">
          Higher Tier · Grades 4–9
        </p>

        {/* ── Input bar ──────────────────────────────────── */}
        {pendingImage && (
          <div className="mb-3 relative inline-block">
            <img
              src={pendingImage}
              alt="Upload preview"
              className="h-20 rounded-xl border border-gray-200 object-cover"
            />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-400 transition-colors"
            >
              <X size={10} className="text-white" />
            </button>
          </div>
        )}

        <div
          className="w-full relative flex items-center rounded-full transition-all hero-input-bar"
          style={{
            background: "#ffffff",
            border: "1.5px solid #d1d5db",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a GCSE maths question..."
            rows={1}
            className="flex-1 bg-transparent text-gray-900 pl-5 pr-2 py-4 text-base resize-none focus:outline-none placeholder-gray-400"
            style={{ minHeight: 52, maxHeight: 120, fieldSizing: "content" } as React.CSSProperties}
          />
          <div className="flex items-center gap-1.5 mr-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-gray-100 active:scale-95 disabled:opacity-30"
              title="Upload a photo"
            >
              <ImagePlus size={16} className={pendingImage ? "text-blue-500" : "text-gray-400"} />
            </button>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
              title="Voice input"
            >
              <Mic size={16} />
            </button>
            <button
              onClick={() => sendMessage()}
              disabled={(!input.trim() && !pendingImage) || loading}
              className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              style={{
                background: input.trim() ? "#22c55e" : "#d1d5db",
                boxShadow: input.trim()
                  ? "0 0 12px rgba(34,197,94,0.6), 0 0 24px rgba(34,197,94,0.3)"
                  : "none",
                transition: "background 0.3s ease, box-shadow 0.3s ease",
              }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin text-white" />
              ) : (
                <ArrowUp size={16} className="text-white" strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>

        {/* Press Enter hint */}
        <p className="text-gray-400 text-sm mt-3">Press Enter to solve</p>

        {/* Bot helper text */}
        <p className="text-gray-500 text-sm mt-4">
          I&apos;ll solve it step by step and explain every mark.
        </p>

        {/* Suggestion chip */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          onClick={() => sendMessage("Solve x² − 5x − 6 = 0")}
          className="mt-5 group flex items-center gap-2 text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-gray-400">Try:</span>
          <span
            className="px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all"
            style={{
              background: "#ffffff",
              border: "1px solid #d1d5db",
              color: "#374151",
            }}
          >
            Solve x² − 5x − 6 = 0
            <ArrowRight size={14} className="text-gray-400" />
          </span>
        </motion.button>
      </motion.div>

      {/* Bottom section */}
      <div className="absolute bottom-8 flex flex-col items-center gap-4">
        <span className="text-[11px] font-medium text-gray-400">
          Mapped to GCSE Higher Tier (Grades 4–9)
        </span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-sm px-4 py-1.5 rounded-full transition-colors"
          style={{
            border: "1px solid #22c55e",
            color: "#22c55e",
            background: "rgba(34, 197, 94, 0.05)",
          }}
        >
          <Camera size={14} />
          Upload a photo instead
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Chat Input Bar — shown below messages in chat mode     */
/* ─────────────────────────────────────────────────────── */
function ChatInputBar(props: InputProps) {
  const {
    input, setInput, loading, pendingImage, setPendingImage,
    fileInputRef, inputRef, handleKeyDown, sendMessage,
  } = props;

  return (
    <div
      className="px-4 py-4 flex-shrink-0 border-t border-gray-100 bg-white"
    >
      {pendingImage && (
        <div className="max-w-3xl mx-auto mb-2">
          <div className="relative inline-block">
            <img
              src={pendingImage}
              alt="Upload preview"
              className="h-20 rounded-xl border border-gray-200 object-cover"
            />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-400 transition-colors"
            >
              <X size={10} className="text-white" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <div
          className="relative flex items-end rounded-2xl transition-all"
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex-shrink-0 mb-2 ml-2 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-gray-100 active:scale-95 disabled:opacity-30"
            title="Upload a photo"
          >
            <ImagePlus size={16} className={pendingImage ? "text-emerald-500" : "text-gray-400"} />
          </button>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question — e.g. Solve 3x − 7 = 14"
            rows={1}
            className="flex-1 bg-transparent text-gray-900 px-2 py-3.5 text-base resize-none focus:outline-none placeholder-gray-400"
            style={{ minHeight: 54, maxHeight: 180, fieldSizing: "content" } as React.CSSProperties}
          />

          <button
            onClick={() => sendMessage()}
            disabled={(!input.trim() && !pendingImage) || loading}
            className="flex-shrink-0 mb-2 mr-2 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            style={{
              background: input.trim() ? "#22c55e" : "#10b981",
              boxShadow: input.trim()
                ? "0 0 12px rgba(34,197,94,0.6), 0 0 24px rgba(34,197,94,0.3)"
                : "0 2px 8px rgba(16,185,129,0.3)",
              transition: "background 0.3s ease, box-shadow 0.3s ease",
            }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin text-white" />
            ) : (
              <ArrowUp size={16} className="text-white" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
      <p className="text-center text-[11px] mt-2.5 text-gray-400">
        Enter to send · Shift+Enter for new line · 📷 Upload a photo
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Message bubble                                         */
/* ─────────────────────────────────────────────────────── */
function MessageBubble({
  message,
  whiteboardResponse,
  onWatchWhiteboard,
}: {
  message: ChatMessage;
  whiteboardResponse?: WhiteboardResponse;
  onWatchWhiteboard?: () => void;
}) {
  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20, y: 6 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="flex justify-end items-end gap-2.5"
      >
        <div
          className="text-white text-base px-5 py-3.5 rounded-2xl rounded-br-md max-w-[78%] leading-relaxed"
          style={{
            background: "linear-gradient(135deg, #059669, #10b981)",
            boxShadow: "0 2px 12px rgba(5,150,105,0.2)",
          }}
        >
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Uploaded question"
              className="rounded-xl mb-2.5 max-h-48 object-contain w-full"
              style={{ border: "1px solid rgba(255,255,255,0.2)" }}
            />
          )}
          {message.content}
        </div>
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}
        >
          <User size={14} className="text-white" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, y: 6 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="flex items-start gap-3"
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
        style={{
          background: "linear-gradient(135deg, #059669, #10b981)",
          boxShadow: "0 2px 8px rgba(16,185,129,0.2)",
        }}
      >
        <Sparkles size={14} className="text-white" />
      </div>

      <div
        className={`rounded-2xl rounded-tl-md w-full max-w-[96%] ${
          whiteboardResponse ? "px-0 py-0" : "px-4 py-4"
        }`}
        style={
          whiteboardResponse
            ? {}
            : {
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
              }
        }
      >
        {whiteboardResponse ? (
          <>
            <WhiteboardRenderer data={whiteboardResponse} />
            {onWatchWhiteboard && (
              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={onWatchWhiteboard}
                className="mt-3 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#059669",
                }}
              >
                <MonitorPlay size={13} />
                Watch on Whiteboard
              </motion.button>
            )}
          </>
        ) : message.parsed ? (
          <>
            <EquationChain data={message.parsed} />
            {onWatchWhiteboard && (
              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={onWatchWhiteboard}
                className="mt-3 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#059669",
                }}
              >
                <MonitorPlay size={13} />
                Watch on Whiteboard
              </motion.button>
            )}
          </>
        ) : (
          <p className="text-gray-700 text-base leading-relaxed"><InlineMath text={message.content} /></p>
        )}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Typing indicator                                       */
/* ─────────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="flex items-start gap-3"
    >
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #059669, #10b981)",
          boxShadow: "0 2px 8px rgba(16,185,129,0.2)",
        }}
      >
        <Sparkles size={14} className="text-white" />
      </div>
      <div
        className="rounded-2xl rounded-tl-md px-5 py-4"
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-emerald-500"
                animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-400">Thinking…</span>
        </div>
      </div>
    </motion.div>
  );
}
