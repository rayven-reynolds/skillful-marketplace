"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LivePlannerCard, CardSkeleton, type LivePlanner } from "@/components/LivePlannerCard";
import { apiFetch } from "@/lib/api";

/* ─── types ─────────────────────────────────────────────────── */
type Favourite    = { planner_profile_id: string; slug: string };
type PlannerPublic = {
  id: string; slug: string; display_name: string | null; bio: string;
  location_text: string; price_min: number; price_max: number;
  specialties: string[]; planning_styles: string[]; event_sizes: string[];
  avg_rating: number | null; review_count: number; is_premium: boolean;
  instagram_url?: string | null;
};
type PortfolioItem = { id: string; photos: string[] };
type InquiryRow = {
  id: string;
  planner_profile_id: string;
  message: string;
  has_planner_reply: boolean;
  created_at: string;
};
type Message = {
  id: string;
  author_user_id: string;
  body: string;
  created_at: string;
};
type Me = { id: string; display_name: string | null } | null;

/* ─── Conversation Modal ──────────────────────────────────────── */
function ConversationModal({
  inquiryId,
  plannerName,
  myUserId,
  originalMessage,
  originalCreatedAt,
  onClose,
  onViewed,
}: {
  inquiryId: string;
  plannerName: string;
  myUserId: string;
  originalMessage: string;
  originalCreatedAt: string;
  onClose: () => void;
  onViewed: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark as viewed when modal opens
  useEffect(() => {
    onViewed();
    loadMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inquiryId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    setLoading(true);
    try {
      const data = await apiFetch<Message[]>(`/inquiries/${inquiryId}/messages`);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/inquiries/${inquiryId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: reply.trim() }),
      });
      setReply("");
      await loadMessages();
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  }

  // Determine if any planner message exists
  const hasPlannerReply = messages.some((m) => m.author_user_id !== myUserId);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
        <div
          className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#3D5C4A" }}>
                Conversation
              </p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-900">{plannerName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
              </div>
            ) : (
              <>
                {/* Original inquiry message — always shown first */}
                {originalMessage && (
                  <div className="flex justify-end">
                    <div
                      className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed text-white"
                      style={{ background: "linear-gradient(135deg, #5C7A65, #3D5C4A)" }}
                    >
                      <p className="whitespace-pre-wrap">{originalMessage}</p>
                      <p className="mt-1 text-[10px] text-white/60">
                        {new Date(originalCreatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}{" "}
                        · {new Date(originalCreatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Subsequent messages */}
                {messages.map((msg) => {
                  const isMe = msg.author_user_id === myUserId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMe
                            ? "rounded-br-sm text-white"
                            : "rounded-bl-sm border border-zinc-200 bg-zinc-50 text-zinc-700"
                        }`}
                        style={isMe ? { background: "linear-gradient(135deg, #5C7A65, #3D5C4A)" } : {}}
                      >
                        {!isMe && (
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#3D5C4A" }}>
                            {plannerName}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                        <p className={`mt-1 text-[10px] ${isMe ? "text-white/60" : "text-zinc-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}{" "}
                          · {new Date(msg.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Waiting state */}
                {!hasPlannerReply && (
                  <div className="flex items-center justify-center gap-2 py-3">
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300" style={{ animationDelay: "0ms" }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300" style={{ animationDelay: "150ms" }} />
                    <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300" style={{ animationDelay: "300ms" }} />
                    <p className="text-xs text-zinc-400">Waiting for {plannerName} to respond</p>
                  </div>
                )}

                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Reply form */}
          <form onSubmit={sendReply} className="border-t border-zinc-100 px-5 pb-5 pt-4">
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a message…"
                className="flex-1 resize-none rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(e as unknown as React.FormEvent); }
                }}
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center self-end rounded-full text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #5C7A65, #3D5C4A)" }}
              >
                {sending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400">Press Enter to send · Shift+Enter for new line</p>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── Wishlist page ───────────────────────────────────────────── */
export default function WishlistPage() {
  const [me, setMe] = useState<Me | "loading">("loading");
  const [planners, setPlanners] = useState<LivePlanner[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());
  // Map planner_profile_id → { inquiryId, hasReply, originalMessage, createdAt }
  const [inquiryMap, setInquiryMap] = useState<
    Record<string, { inquiryId: string; hasReply: boolean; originalMessage: string; createdAt: string }>
  >({});
  // Track which inquiries have been "seen" (badge cleared) — stored in state for instant update
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [activeConversation, setActiveConversation] = useState<{
    inquiryId: string;
    plannerName: string;
    originalMessage: string;
    createdAt: string;
  } | null>(null);

  useEffect(() => {
    apiFetch<NonNullable<Me>>("/auth/me")
      .then((u) => { setMe(u); loadWishlist(); })
      .catch(() => setMe(null));
  }, []);

  async function loadWishlist() {
    setLoading(true);
    try {
      const [favs, inquiries] = await Promise.all([
        apiFetch<Favourite[]>("/favorites"),
        apiFetch<InquiryRow[]>("/inquiries/mine").catch(() => [] as InquiryRow[]),
      ]);

      setSavedIds(new Set(favs.map((f) => f.planner_profile_id)));
      setContactedIds(new Set(inquiries.map((i) => i.planner_profile_id)));

      const iMap: Record<string, { inquiryId: string; hasReply: boolean; originalMessage: string; createdAt: string }> = {};
      for (const inq of inquiries) {
        iMap[inq.planner_profile_id] = {
          inquiryId: inq.id,
          hasReply: inq.has_planner_reply,
          originalMessage: inq.message ?? "",
          createdAt: inq.created_at,
        };
      }
      setInquiryMap(iMap);

      if (favs.length === 0) return;

      const profiles = await Promise.all(
        favs.map((f) =>
          apiFetch<PlannerPublic>(`/public/planners/by-slug/${f.slug}`).catch(() => null)
        )
      );

      const cards: LivePlanner[] = await Promise.all(
        profiles
          .filter((p): p is PlannerPublic => p !== null)
          .map(async (p) => {
            let photos: string[] = [];
            try {
              const items = await apiFetch<PortfolioItem[]>(`/public/planners/by-slug/${p.slug}/portfolio`);
              photos = items.flatMap((item) => item.photos).filter(Boolean);
            } catch { /* no portfolio */ }
            return { ...p, photos };
          })
      );
      setPlanners(cards);
    } catch { /* not signed in */ } finally {
      setLoading(false);
    }
  }

  const toggleSave = useCallback(
    async (plannerProfileId: string) => {
      const alreadySaved = savedIds.has(plannerProfileId);
      setSavedIds((prev) => {
        const n = new Set(prev);
        if (alreadySaved) n.delete(plannerProfileId); else n.add(plannerProfileId);
        return n;
      });
      if (alreadySaved) setPlanners((prev) => prev.filter((p) => p.id !== plannerProfileId));
      try {
        await apiFetch(`/favorites/${plannerProfileId}`, { method: alreadySaved ? "DELETE" : "POST" });
      } catch {
        setSavedIds((prev) => {
          const n = new Set(prev);
          if (alreadySaved) n.add(plannerProfileId); else n.delete(plannerProfileId);
          return n;
        });
      }
    },
    [savedIds],
  );

  // Count unread responses: has_planner_reply && not yet seen
  const unreadCount = Object.values(inquiryMap).filter(
    (v) => v.hasReply && !seenIds.has(v.inquiryId)
  ).length;

  const myUserId = me && me !== "loading" ? me.id : "";

  /* ── Not signed in ── */
  if (me === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-16 text-center sm:px-6">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-500">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20.5s-7.5-4.6-9.4-9.2A5.2 5.2 0 0 1 12 5.6a5.2 5.2 0 0 1 9.4 5.7C19.5 15.9 12 20.5 12 20.5z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Sign in to see your wishlist</h1>
          <p className="mt-2 text-sm text-zinc-500">Your saved planners are tied to your account.</p>
        </div>
        <div className="flex justify-center gap-3">
          <Link href="/login" className="rounded-full bg-rose-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-800">Log in</Link>
          <Link href="/register" className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-900">Sign up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#3D5C4A" }}>Wishlist</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Planners you&rsquo;ve saved</h1>
        {planners.length > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>{planners.length} saved planner{planners.length !== 1 ? "s" : ""}</span>
            {contactedIds.size > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                {contactedIds.size} contacted
              </span>
            )}
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                {unreadCount} new response{unreadCount !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Loading */}
      {(me === "loading" || loading) ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : planners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-500">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20.5s-7.5-4.6-9.4-9.2A5.2 5.2 0 0 1 12 5.6a5.2 5.2 0 0 1 9.4 5.7C19.5 15.9 12 20.5 12 20.5z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-zinc-900">No saved planners yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">Tap the heart icon on any planner card to save them here.</p>
          <Link href="/browse" className="mt-5 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #5C7A65, #3D5C4A)" }}>
            Browse planners
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {planners.map((p) => {
            const inqInfo = inquiryMap[p.id];
            const hasUnread = inqInfo?.hasReply && !seenIds.has(inqInfo.inquiryId);

            // CTA: "View Conversation" if contacted, otherwise default "Contact Me"
            const ctaButton = inqInfo ? (
              <button
                type="button"
                onClick={() => setActiveConversation({
                  inquiryId: inqInfo.inquiryId,
                  plannerName: p.display_name ?? "Planner",
                  originalMessage: inqInfo.originalMessage,
                  createdAt: inqInfo.createdAt,
                })}
                className="relative block w-full rounded-full py-1.5 text-center text-xs font-semibold text-white transition hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #b45309, #78350f)" }}
              >
                {hasUnread ? "New Response — View Conversation" : "View Conversation"}
              </button>
            ) : undefined;

            return (
              <LivePlannerCard
                key={p.id}
                planner={p}
                isSaved={savedIds.has(p.id)}
                isLoggedIn
                onToggleSave={toggleSave}
                contacted={contactedIds.has(p.id)}
                cta={ctaButton}
              />
            );
          })}
        </div>
      )}

      {/* Conversation modal */}
      {activeConversation && myUserId && (
        <ConversationModal
          inquiryId={activeConversation.inquiryId}
          plannerName={activeConversation.plannerName}
          myUserId={myUserId}
          originalMessage={activeConversation.originalMessage}
          originalCreatedAt={activeConversation.createdAt}
          onClose={() => setActiveConversation(null)}
          onViewed={() => {
            // Mark this inquiry as seen → clears the notification dot
            setSeenIds((prev) => new Set([...prev, activeConversation.inquiryId]));
          }}
        />
      )}
    </div>
  );
}
