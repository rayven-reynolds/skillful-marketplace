"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AvailabilityCalendar, type AvailabilityBlock } from "@/components/AvailabilityCalendar";
import { apiFetch } from "@/lib/api";

type Profile = {
  id: string;
  slug: string;
  bio: string;
  location_text: string;
  price_min: number;
  price_max: number;
  planning_styles: string[];
  specialties: string[];
  event_sizes: string[];
  aesthetic_tags: string[];
  timezone: string;
  instagram_url?: string | null;
};

type PortfolioItem = {
  id: string;
  title: string;
  event_type: string;
  photos: string[];
  budget_breakdown: Record<string, unknown>;
};

type Me = { id: string; role: string; display_name: string | null } | null;

const PRESET_SPECIALTIES = [
  { value: "wedding", label: "Wedding" },
  { value: "corporate", label: "Corporate" },
  { value: "birthday", label: "Birthday" },
  { value: "micro_wedding", label: "Micro-wedding" },
  { value: "anniversary", label: "Anniversary" },
  { value: "baby_shower", label: "Baby Shower" },
  { value: "graduation", label: "Graduation" },
  { value: "conference", label: "Conference" },
  { value: "retreat", label: "Retreat" },
  { value: "gala", label: "Gala" },
  { value: "other", label: "Other" },
];

const PLANNING_STYLES = [
  { value: "full_service", label: "Full service" },
  { value: "month_of", label: "Month-of coordination" },
  { value: "partial", label: "Partial planning" },
  { value: "day_of", label: "Day-of coordination" },
  { value: "venue_only", label: "Venue search only" },
];

const EVENT_SIZES = [
  { value: "under_50", label: "Under 50 guests" },
  { value: "50_150", label: "50–150 guests" },
  { value: "150_300", label: "150–300 guests" },
  { value: "300_plus", label: "300+ guests" },
];

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sage-mid focus:ring-2 focus:ring-sage-tint";

const MAX_SPECIALTIES = 3;

function Chip({ label, selected, onClick, disabled }: { label: string; selected: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !selected}
      className={[
        "rounded-full border px-3 py-1 text-xs font-medium transition",
        selected ? "border-sage-dark bg-sage-tint text-sage-dark" : "border-zinc-200 text-zinc-600 hover:border-zinc-400",
        disabled && !selected ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}


type Tab = "profile" | "photos" | "availability" | "inquiries" | "reviews";

type PlannerReview = {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  verified: boolean;
  reviewer_display_name: string | null;
};

type Inquiry = {
  id: string;
  client_user_id: string;
  client_display_name: string | null;
  client_segment: string;
  event_date: string | null;
  message: string;
  status: string;
  created_at: string;
};

/* ─── Status pill helper ──────────────────────────────────── */
const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  open:      { label: "Open",      bg: "bg-emerald-50",  text: "text-emerald-700" },
  responded: { label: "Responded", bg: "bg-blue-50",     text: "text-blue-700"    },
  booked:    { label: "Booked",    bg: "bg-violet-50",   text: "text-violet-700"  },
  canceled:  { label: "Canceled",  bg: "bg-zinc-100",    text: "text-zinc-500"    },
};

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, bg: "bg-zinc-100", text: "text-zinc-600" };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${meta.bg} ${meta.text}`}>
      {meta.label}
    </span>
  );
}

type ThreadMessage = { id: string; author_user_id: string; body: string; created_at: string };

const SEEN_KEY = "eventsee_seen_inq";

function getSeenIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  const ids = getSeenIds();
  if (ids.has(id)) return;
  ids.add(id);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  // Notify other components (AppNav) listening for storage changes
  window.dispatchEvent(new StorageEvent("storage", { key: SEEN_KEY }));
}

/* ─── Single expandable inquiry card ─────────────────────── */
function InquiryCard({
  inq,
  plannerUserId,
  onSeen,
  onUpdate,
}: {
  inq: Inquiry;
  plannerUserId: string;
  onSeen: (id: string) => void;
  onUpdate: (patch: Partial<Inquiry>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    setMsgsLoading(true);
    try {
      const rows = await apiFetch<ThreadMessage[]>(`/inquiries/${inq.id}/messages`);
      setMessages(rows);
    } catch {
      // ignore
    } finally {
      setMsgsLoading(false);
    }
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      if (messages.length === 0) loadMessages();
      // Mark as seen when the planner first opens the card
      markSeen(inq.id);
      onSeen(inq.id);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await apiFetch(`/inquiries/${inq.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: reply.trim() }),
      });
      setReply("");
      if (inq.status === "open") onUpdate({ status: "responded" });
      await loadMessages();
      // scroll to bottom
      setTimeout(() => {
        threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    } catch {
      // silently ignore
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(newStatus: string) {
    setStatusUpdating(true);
    try {
      await apiFetch(`/inquiries/${inq.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      onUpdate({ status: newStatus });
    } catch {
      // silently ignore
    } finally {
      setStatusUpdating(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* ── Collapsed header — always visible ── */}
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-start gap-4 p-5 text-left transition hover:bg-zinc-50"
      >
        {/* Avatar */}
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
          {(inq.client_display_name ?? "?").charAt(0).toUpperCase()}
        </div>

        {/* Name + date */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {inq.client_display_name ?? "Anonymous"}
          </p>
          <p className="text-xs text-zinc-400">
            {new Date(inq.created_at).toLocaleDateString(undefined, {
              month: "short", day: "numeric", year: "numeric",
            })}
          </p>
        </div>

        {/* Badges */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {inq.event_date && (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
              📅{" "}
              {new Date(inq.event_date + "T12:00:00").toLocaleDateString(undefined, {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
          )}
          <StatusPill status={inq.status} />
        </div>

        {/* Chevron */}
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── Expanded body ── */}
      {open && (
        <div className="border-t border-zinc-100 px-5 pb-5 pt-4 space-y-4">

          {/* ── Full chat thread ── */}
          <div
            ref={threadRef}
            className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-zinc-100 bg-zinc-50 p-4"
          >
            {/* Original inquiry bubble — always first */}
            {inq.message && (
              <div className="flex justify-start">
                <div className="max-w-[80%]">
                  <p className="mb-1 text-[10px] font-medium text-zinc-400">
                    {inq.client_display_name ?? "Client"} · {new Date(inq.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                  <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-sm leading-relaxed text-zinc-800 shadow-sm border border-zinc-100">
                    <p className="whitespace-pre-wrap">{inq.message}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Subsequent thread messages */}
            {msgsLoading ? (
              <div className="flex justify-center py-2">
                <svg className="h-4 w-4 animate-spin text-zinc-300" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a8 8 0 000 16v-4a8 8 0 01-8-8z" />
                </svg>
              </div>
            ) : messages.map((m) => {
              const isMe = m.author_user_id === plannerUserId;
              return (
                <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[80%]">
                    <p className={`mb-1 text-[10px] font-medium ${isMe ? "text-right text-zinc-400" : "text-zinc-400"}`}>
                      {isMe ? "You" : (inq.client_display_name ?? "Client")}
                      {" · "}
                      {new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMe
                          ? "rounded-br-sm text-white"
                          : "rounded-tl-sm bg-white text-zinc-800 border border-zinc-100 shadow-sm"
                      }`}
                      style={isMe ? { background: "linear-gradient(135deg, #5C7A65, #3D5C4A)" } : undefined}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {!msgsLoading && messages.length === 0 && !inq.message && (
              <p className="text-center text-xs italic text-zinc-400">No messages yet.</p>
            )}
          </div>

          {/* Status control — planner only, never shown to client */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-zinc-500 flex-shrink-0">Lead status</label>
            <div className="relative">
              <select
                value={inq.status}
                disabled={statusUpdating}
                onChange={(e) => updateStatus(e.target.value)}
                className="appearance-none rounded-full border border-zinc-300 bg-white py-1 pl-3 pr-7 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:opacity-60 cursor-pointer"
              >
                <option value="open">Open</option>
                <option value="responded">Responded</option>
                <option value="booked">Booked</option>
                <option value="canceled">Canceled</option>
              </select>
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
            {statusUpdating && <span className="text-xs text-zinc-400">Saving…</span>}
          </div>

          {/* Reply form */}
          <form onSubmit={sendReply} className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-500">Reply to {inq.client_display_name ?? "client"}</label>
            <textarea
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write your response…"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
            />
            <button
              type="submit"
              disabled={sending || !reply.trim()}
              className="rounded-full px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #5C7A65, #3D5C4A)" }}
            >
              {sending ? "Sending…" : "Send reply"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ─── Stars helper ────────────────────────────────────────── */
function StarRow({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ color: s <= value ? "#FBBF24" : "#D1D5DB" }} className="text-sm">★</span>
      ))}
    </div>
  );
}

/* ─── Reviews panel ───────────────────────────────────────── */
function ReviewsPanel({ reviews, loading }: { reviews: PlannerReview[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 py-16 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl">⭐</div>
        <p className="text-sm font-medium text-zinc-700">No reviews yet</p>
        <p className="mt-1 text-xs text-zinc-400">Once clients leave a review it will appear here.</p>
      </div>
    );
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    pct: Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100),
  }));

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col items-center gap-1 sm:w-40 sm:shrink-0">
            <span className="text-4xl font-bold text-zinc-900">{avg.toFixed(1)}</span>
            <span className="text-xs text-zinc-400">out of 5.0</span>
            <StarRow value={Math.round(avg)} />
            <span className="mt-1 text-xs text-zinc-500">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex-1 space-y-1.5">
            {dist.map(({ star, pct }) => (
              <div key={star} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-right text-xs text-zinc-500">{star} Star</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <div className="absolute left-0 top-0 h-full rounded-full bg-zinc-800 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-9 shrink-0 text-xs text-zinc-500">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Individual reviews */}
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-600">
                {(r.reviewer_display_name ?? "A").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-zinc-900">
                    {r.reviewer_display_name ?? "Anonymous"}
                  </span>
                  <div className="flex items-center gap-2">
                    {r.verified && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        Verified
                      </span>
                    )}
                    <StarRow value={r.rating} />
                  </div>
                </div>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                </p>
                {r.body && <p className="mt-2 text-sm leading-relaxed text-zinc-700">{r.body}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Inquiries panel ─────────────────────────────────────── */
function InquiriesPanel({
  inquiries,
  loading,
  plannerUserId,
  onSeen,
  onUpdate,
}: {
  inquiries: Inquiry[];
  loading: boolean;
  plannerUserId: string;
  onSeen: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Inquiry>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-700">
        <p className="font-medium text-zinc-900">Client Inquiries</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          Click a lead to see the full conversation, reply, and update its status. Status is only visible to you.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-zinc-100 bg-zinc-50" />
          ))}
        </div>
      ) : inquiries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 py-16 text-center">
          <svg viewBox="0 0 24 24" className="h-10 w-10 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-sm font-medium text-zinc-500">No inquiries yet</p>
          <p className="text-xs text-zinc-400">When clients contact you through your profile, their messages will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => (
            <InquiryCard
              key={inq.id}
              inq={inq}
              plannerUserId={plannerUserId}
              onSeen={onSeen}
              onUpdate={(patch) => onUpdate(inq.id, patch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyBusinessPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | "loading">("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [tab, setTab] = useState<Tab>("profile");

  // Profile edit state
  const [businessName, setBusinessName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [instagram, setInstagram] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deletingBiz, setDeletingBiz] = useState(false);
  const [deleteBizConfirm, setDeleteBizConfirm] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Inquiries state
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<PlannerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => getSeenIds());

  // Photo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string>("");
  const [newPhotoTitle, setNewPhotoTitle] = useState("");
  const [newPhotoType, setNewPhotoType] = useState("");
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<NonNullable<Me>>("/auth/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const loadData = useCallback(() => {
    Promise.all([
      apiFetch<Profile>("/planner/profile/me"),
      apiFetch<PortfolioItem[]>("/planner/portfolio/me"),
      apiFetch<AvailabilityBlock[]>("/planner/availability/me"),
    ]).then(([p, port, avail]) => {
      setProfile(p);
      setPortfolio(port);
      setBlocks(avail);
      // Seed business name from the resolved me object (display_name)
      if (me && me !== "loading" && me.display_name) {
        setBusinessName(me.display_name);
      }
      setBio(p.bio);
      setLocation(p.location_text);
      setStartingPrice(String(p.price_min));
      setSelectedSpecialties((p.specialties ?? []).slice(0, MAX_SPECIALTIES));
      setSelectedStyles(p.planning_styles ?? []);
      setSelectedSizes(p.event_sizes ?? []);
      setInstagram(p.instagram_url ?? "");
    }).catch(() => {});
  }, [me]);

  useEffect(() => {
    if (me && me !== "loading" && me.role === "planner") {
      loadData();
    }
  }, [me, loadData]);

  function toggle(arr: string[], val: string, setArr: (v: string[]) => void) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      // Update the display name (business name shown on cards) if provided
      if (businessName.trim()) {
        const nameParts = businessName.trim().split(" ");
        await apiFetch("/auth/profile", {
          method: "PATCH",
          body: JSON.stringify({
            first_name: nameParts[0] ?? "",
            last_name: nameParts.slice(1).join(" ") || null,
          }),
        }).catch(() => {});
      }

      await apiFetch("/planner/profile/me", {
        method: "PATCH",
        body: JSON.stringify({
          slug: profile.slug,
          bio,
          location_text: location,
          price_min: parseInt(startingPrice || "0", 10),
          price_max: parseInt(startingPrice || "0", 10),
          planning_styles: selectedStyles,
          event_sizes: selectedSizes,
          specialties: selectedSpecialties,
          aesthetic_tags: profile.aesthetic_tags ?? [],
          timezone: profile.timezone ?? "UTC",
          instagram_url: instagram.trim() || null,
        }),
      });
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setNewPhotoFile(file);
    setUploadError(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setNewPhotoPreview(url);
    } else {
      setNewPhotoPreview("");
    }
  }

  async function addPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!newPhotoFile) return;
    setAddingPhoto(true);
    setUploadError(null);
    try {
      // Upload image file to Next.js route → get a served URL back
      const formData = new FormData();
      formData.append("file", newPhotoFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const { error } = await uploadRes.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error ?? "Upload failed");
      }
      const { url } = await uploadRes.json() as { url: string };

      const item = await apiFetch<PortfolioItem>("/planner/portfolio/me", {
        method: "POST",
        body: JSON.stringify({
          title: newPhotoTitle || "Portfolio photo",
          event_type: newPhotoType.trim() || "other",
          photos: [url],
          budget_breakdown: {},
        }),
      });
      setPortfolio((prev) => [...prev, item]);
      // Reset form
      setNewPhotoFile(null);
      setNewPhotoPreview("");
      setNewPhotoTitle("");
      setNewPhotoType("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAddingPhoto(false);
    }
  }

  async function removePhoto(id: string) {
    try {
      await apiFetch(`/planner/portfolio/me/${id}`, { method: "DELETE" });
      setPortfolio((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // silently fail
    }
  }

  const toggleAvailability = useCallback(
    async (dateStr: string, currentlyBusy: boolean, blockId: string | undefined) => {
      if (currentlyBusy && blockId) {
        await apiFetch(`/planner/availability/me/${blockId}`, { method: "DELETE" }).catch(() => {});
        setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      } else {
        const start = new Date(dateStr + "T00:00:00Z");
        const end = new Date(dateStr + "T23:59:59Z");
        try {
          const block = await apiFetch<AvailabilityBlock>("/planner/availability/me", {
            method: "POST",
            body: JSON.stringify({
              start_ts: start.toISOString(),
              end_ts: end.toISOString(),
              all_day: true,
            }),
          });
          setBlocks((prev) => [...prev, block]);
        } catch {
          // silently fail
        }
      }
    },
    [],
  );

  // Load inquiries whenever the inquiries tab is activated (must be before early returns)
  useEffect(() => {
    if (tab !== "inquiries") return;
    setInquiriesLoading(true);
    apiFetch<Inquiry[]>("/inquiries/inbox/planner")
      .then(setInquiries)
      .catch(() => setInquiries([]))
      .finally(() => setInquiriesLoading(false));
  }, [tab]);

  // Load reviews whenever the reviews tab is activated
  useEffect(() => {
    if (tab !== "reviews" || !profile) return;
    setReviewsLoading(true);
    apiFetch<PlannerReview[]>(`/public/planners/by-slug/${profile.slug}/reviews`)
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [tab, profile]);

  if (me === "loading") return null;

  if (!me) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Sign in to manage your business</h1>
        <Link href="/login" className="mt-4 inline-block rounded-full bg-rose-700 px-5 py-2.5 text-sm font-medium text-white">Log in</Link>
      </div>
    );
  }

  if (me.role !== "planner") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">You don&apos;t have a planner profile yet</h1>
        <p className="mt-2 text-sm text-zinc-500">Create one to start accepting clients.</p>
        <Link href="/become-a-planner" className="mt-4 inline-block rounded-full bg-rose-700 px-5 py-2.5 text-sm font-medium text-white">
          Become a Planner
        </Link>
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "photos", label: "Photos" },
    { id: "availability", label: "Availability" },
    { id: "inquiries", label: "Inquiries" },
    { id: "reviews", label: "My Reviews" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">My Business</h1>
          {profile && (
            <p className="mt-1 text-sm text-zinc-500">
              Your public profile:{" "}
              <Link href={`/planners/${profile.slug}`} className="text-rose-700 underline">
                /planners/{profile.slug}
              </Link>
            </p>
          )}
        </div>
        {profile && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/planners/${profile.slug}`}
              className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-900"
            >
              View public profile
            </Link>
            <button
              type="button"
              onClick={() => setTab("inquiries")}
              className="relative rounded-full border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-900"
            >
              View my inquiries
              {(() => {
                const unseen = inquiries.filter(
                  (i) => i.status === "open" && !seenIds.has(i.id)
                ).length;
                return unseen > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                    {unseen > 9 ? "9+" : unseen}
                  </span>
                ) : null;
              })()}
            </button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-zinc-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px",
              tab === t.id
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-zinc-600 hover:text-zinc-900",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ─────────────────────────────────────────── */}
      {tab === "profile" && (
        <form onSubmit={saveProfile} className="space-y-6">
          <label className="block text-xs font-semibold text-zinc-700">
            Business name
            <span className="ml-1 font-normal text-zinc-400">(shown on your card instead of your personal name)</span>
            <input
              className={inputCls}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Studio Bloom Events"
            />
          </label>

          <label className="block text-xs font-semibold text-zinc-700">
            About your business <span className="text-red-500">*</span>
            <textarea
              required
              rows={4}
              className={inputCls}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell clients what makes your planning style unique…"
            />
          </label>

          <label className="block text-xs font-semibold text-zinc-700">
            Location <span className="text-red-500">*</span>
            <input
              required
              className={inputCls}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Austin, TX"
            />
          </label>

          <label className="block text-xs font-semibold text-zinc-700">
            Starting price ($) <span className="text-red-500">*</span>
            <input
              type="number"
              required
              min="1"
              step="1"
              className={inputCls}
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
              placeholder="3000"
            />
            <span className="mt-0.5 block text-xs font-normal text-zinc-400">The minimum price for your services.</span>
          </label>

          <label className="block text-xs font-semibold text-zinc-700">
            Instagram handle
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 focus-within:border-sage-mid focus-within:ring-2 focus-within:ring-sage-tint">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
              </svg>
              <input
                type="text"
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
                placeholder="@yourbusiness"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
              />
            </div>
          </label>

          {/* Event specialties */}
          <div>
            <p className="mb-1 text-xs font-semibold text-zinc-700">
              Event specialties
              <span className="ml-1 font-normal text-zinc-400">(choose up to {MAX_SPECIALTIES})</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {PRESET_SPECIALTIES.map((s) => (
                <Chip
                  key={s.value}
                  label={s.label}
                  selected={selectedSpecialties.includes(s.value)}
                  onClick={() => toggle(selectedSpecialties, s.value, setSelectedSpecialties)}
                  disabled={selectedSpecialties.length >= MAX_SPECIALTIES}
                />
              ))}
            </div>
            {selectedSpecialties.length >= MAX_SPECIALTIES && (
              <p className="mt-1.5 text-[11px] text-sage-mid">Max {MAX_SPECIALTIES} specialties selected.</p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-zinc-700">Planning styles</p>
            <div className="flex flex-wrap gap-2">
              {PLANNING_STYLES.map((s) => (
                <Chip
                  key={s.value}
                  label={s.label}
                  selected={selectedStyles.includes(s.value)}
                  onClick={() => toggle(selectedStyles, s.value, setSelectedStyles)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-zinc-700">Event sizes</p>
            <div className="flex flex-wrap gap-2">
              {EVENT_SIZES.map((s) => (
                <Chip
                  key={s.value}
                  label={s.label}
                  selected={selectedSizes.includes(s.value)}
                  onClick={() => toggle(selectedSizes, s.value, setSelectedSizes)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-rose-700 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-rose-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saveMsg && (
              <span className={saveMsg === "Saved!" ? "text-sm text-emerald-700" : "text-sm text-red-600"}>
                {saveMsg}
              </span>
            )}
          </div>

          {/* ── Danger zone ─────────────────────────── */}
          <div className="mt-10 rounded-2xl border border-red-200 p-5" style={{ background: "#FFF8F8" }}>
            <h3 className="text-sm font-semibold text-red-700">Danger zone</h3>
            <p className="mt-1 text-xs text-red-500">
              Deleting your business profile is permanent. Your planner page, portfolio, and inquiries will be removed.
            </p>
            {!deleteBizConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteBizConfirm(true)}
                className="mt-3 rounded-full border border-red-300 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                Delete business account
              </button>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-xs font-medium text-red-700">Are you sure? This cannot be undone.</p>
                <button
                  type="button"
                  disabled={deletingBiz}
                  onClick={async () => {
                    setDeletingBiz(true);
                    try {
                      await apiFetch("/planner/profile/me", { method: "DELETE" });
                      router.push("/");
                    } catch {
                      setDeletingBiz(false);
                      setDeleteBizConfirm(false);
                    }
                  }}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {deletingBiz ? "Deleting…" : "Yes, delete it"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteBizConfirm(false)}
                  className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold text-zinc-600 hover:border-zinc-500"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* ── Photos tab ──────────────────────────────────────────── */}
      {tab === "photos" && (
        <div className="space-y-6">
          {/* Photo count indicator */}
          <div className={[
            "flex items-center gap-2 rounded-xl px-4 py-3 text-sm",
            portfolio.length >= 3 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
          ].join(" ")}>
            <span className="font-semibold">{portfolio.length}</span> portfolio photo{portfolio.length !== 1 ? "s" : ""}
            {portfolio.length < 3
              ? ` — ${3 - portfolio.length} more required to meet the minimum of 3.`
              : " — minimum requirement met ✓"}
          </div>

          {/* Existing photos grid */}
          {portfolio.length === 0 ? (
            <p className="text-sm text-zinc-500">No photos yet. Add at least 3 below.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {portfolio.map((item) => (
                <div key={item.id} className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                  {item.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.photos[0]}
                      alt={item.title}
                      className="h-32 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center bg-zinc-100 text-xs text-zinc-400">
                      No image
                    </div>
                  )}
                  <div className="p-2">
                    <p className="truncate text-xs font-medium text-zinc-800">{item.title}</p>
                    <p className="truncate text-[11px] text-zinc-400">{item.event_type}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(item.id)}
                    className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white group-hover:flex"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add photo form */}
          <form onSubmit={addPhoto} className="space-y-4 rounded-xl border border-dashed border-zinc-300 p-5">
            <p className="text-xs font-semibold text-zinc-700">Add a photo</p>

            {/* File picker */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                required
                onChange={onFileChange}
                className="sr-only"
                id="photo-file-input"
              />
              <label
                htmlFor="photo-file-input"
                className={[
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition",
                  newPhotoPreview
                    ? "border-rose-300 bg-rose-50"
                    : "border-zinc-300 bg-zinc-50 hover:border-zinc-400",
                ].join(" ")}
              >
                {newPhotoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={newPhotoPreview}
                    alt="Preview"
                    className="max-h-48 max-w-full rounded-lg object-contain"
                  />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-xs text-zinc-500">
                      Click to upload an image
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      JPEG, PNG, WebP or GIF — any size
                    </span>
                  </>
                )}
              </label>
              {newPhotoPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setNewPhotoFile(null);
                    setNewPhotoPreview("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="mt-1.5 text-xs text-zinc-400 hover:text-zinc-700 underline"
                >
                  Remove image
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <label className="flex-1 text-xs text-zinc-600">
                Title
                <input
                  className={inputCls}
                  placeholder="Summer garden wedding"
                  value={newPhotoTitle}
                  onChange={(e) => setNewPhotoTitle(e.target.value)}
                />
              </label>

              <label className="flex-1 text-xs text-zinc-600">
                Event type
                <select
                  className={inputCls}
                  value={newPhotoType}
                  onChange={(e) => setNewPhotoType(e.target.value)}
                >
                  <option value="">Select…</option>
                  {PRESET_SPECIALTIES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {uploadError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{uploadError}</p>
            )}

            <button
              type="submit"
              disabled={addingPhoto || !newPhotoFile}
              className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {addingPhoto ? "Uploading…" : "Add photo"}
            </button>
          </form>
        </div>
      )}

      {/* ── Availability tab ─────────────────────────────────────── */}
      {tab === "availability" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-700">
            <p className="font-medium">Manage your availability</p>
            <p className="mt-1 text-xs text-zinc-500">
              Click any <span className="font-medium text-emerald-700">green</span> date to mark it unavailable.
              Click a <span className="font-medium text-zinc-600">grey</span> date to make it available again.
              Changes save instantly.
            </p>
            {blocks.length === 0 && (
              <p className="mt-2 text-xs font-medium text-amber-600">
                ⚠ No availability set yet. Clients expect to see your calendar. Mark any unavailable dates below.
              </p>
            )}
          </div>
          <AvailabilityCalendar
            blocks={blocks}
            editable
            onToggle={toggleAvailability}
          />
        </div>
      )}

      {/* ── Inquiries tab ─────────────────────────────────────────── */}
      {tab === "inquiries" && (
        <InquiriesPanel
          inquiries={inquiries}
          loading={inquiriesLoading}
          plannerUserId={typeof me === "object" && me ? me.id : ""}
          onSeen={(id) => setSeenIds((prev) => new Set([...prev, id]))}
          onUpdate={(id, patch) =>
            setInquiries((prev) =>
              prev.map((inq) => (inq.id === id ? { ...inq, ...patch } : inq))
            )
          }
        />
      )}

      {/* ── Reviews tab ───────────────────────────────────────────── */}
      {tab === "reviews" && (
        <ReviewsPanel reviews={reviews} loading={reviewsLoading} />
      )}
    </div>
  );
}
