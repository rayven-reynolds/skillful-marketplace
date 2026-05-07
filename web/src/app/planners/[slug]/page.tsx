"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AvailabilityCalendar, type AvailabilityBlock } from "@/components/AvailabilityCalendar";
import { apiFetch } from "@/lib/api";

type PlannerDetail = {
  id: string;
  slug: string;
  display_name: string | null;
  bio: string;
  location_text: string;
  price_min: number;
  price_max: number;
  planning_styles: string[];
  specialties: string[];
  event_sizes: string[];
  aesthetic_tags: string[];
  avg_rating: number | null;
  review_count: number;
  is_premium: boolean;
  timezone: string;
  instagram_url?: string | null;
};

type PortfolioItem = { id: string; title: string; event_type: string; photos: string[] };
type Review = {
  id: string;
  rating: number;
  body: string;
  reviewer_display_name: string | null;
  created_at: string;
  verified?: boolean;
};
type EventPrefs = { phone?: string | null; event_date?: string | null; event_type?: string | null; guest_count?: string | null };
type Me = { id: string; role: string; display_name: string | null; event_prefs?: EventPrefs | null } | null;
type Favourite = { planner_profile_id: string };

/** Split a "First Last" display_name into parts. */
function splitName(name: string | null) {
  if (!name) return { first: "", last: "" };
  const idx = name.indexOf(" ");
  if (idx === -1) return { first: name, last: "" };
  return { first: name.slice(0, idx), last: name.slice(idx + 1) };
}

const STYLE_LABELS: Record<string, string> = {
  full_service: "Full service",
  month_of: "Month-of coordination",
  partial: "Partial planning",
  day_of: "Day-of coordination",
  venue_only: "Venue search only",
};
const SPECIALTY_LABELS: Record<string, string> = {
  wedding: "Weddings", corporate: "Corporate", birthday: "Birthdays",
  micro_wedding: "Micro-weddings", anniversary: "Anniversaries",
  baby_shower: "Baby showers", graduation: "Graduations",
  conference: "Conferences", retreat: "Retreats", gala: "Galas",
};
const SIZE_LABELS: Record<string, string> = {
  under_50: "Under 50 guests", "50_150": "50–150 guests",
  "150_300": "150–300 guests", "300_plus": "300+ guests",
};

function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  return (
    <span className="flex text-amber-400">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 16 16" className="h-4 w-4" fill={i < full ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
          <polygon points="8,1.5 10,5.8 15,6.3 11.5,9.6 12.5,14.5 8,12 3.5,14.5 4.5,9.6 1,6.3 6,5.8" />
        </svg>
      ))}
    </span>
  );
}

export default function PlannerProfilePage() {
  const { slug } = useParams<{ slug: string }>();

  const [profile, setProfile] = useState<PlannerDetail | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewBody, setReviewBody] = useState("");
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [me, setMe] = useState<Me>(null);
  const [myPlannerSlug, setMyPlannerSlug] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEventDate, setContactEventDate] = useState<string>("");
  const [contactEventType, setContactEventType] = useState("");
  const [contactGuestCount, setContactGuestCount] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSending, setContactSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      apiFetch<PlannerDetail>(`/public/planners/by-slug/${slug}`).catch(() => null),
      apiFetch<PortfolioItem[]>(`/public/planners/by-slug/${slug}/portfolio`).catch(() => []),
      apiFetch<Review[]>(`/public/planners/by-slug/${slug}/reviews`).catch(() => []),
      apiFetch<AvailabilityBlock[]>(`/public/planners/by-slug/${slug}/availability`).catch(() => []),
      apiFetch<Me>("/auth/me").catch(() => null),
      apiFetch<Favourite[]>("/favorites").catch(() => []),
    ]).then(([p, port, revs, avail, me, favs]) => {
      if (!p) { setNotFound(true); return; }
      setProfile(p);
      setPortfolio(port as PortfolioItem[]);
      setReviews(revs as Review[]);
      setBlocks(avail as AvailabilityBlock[]);
      const resolvedMe = me as Me;
      setMe(resolvedMe);
      if (resolvedMe) {
        const { first, last } = splitName(resolvedMe.display_name);
        setContactFirstName(first);
        setContactLastName(last);
        const prefs = resolvedMe.event_prefs;
        if (prefs) {
          setContactPhone(prefs.phone ?? "");
          setContactEventDate(prefs.event_date ?? "");
          setContactEventType(prefs.event_type ?? "");
          setContactGuestCount(prefs.guest_count ?? "");
        }
      }
      // If the visitor is a planner, fetch their own profile slug so we can
      // accurately determine ownership. We cannot use role alone — any planner
      // visiting any profile page would otherwise pass the check.
      if (resolvedMe?.role === "planner") {
        apiFetch<{ slug: string }>("/planner/profile/me")
          .then((own) => setMyPlannerSlug(own.slug))
          .catch(() => {});
      }
      const saved = (favs as Favourite[]).some((f) => f.planner_profile_id === p.id);
      setIsSaved(saved);
      const firstPhoto = (port as PortfolioItem[])[0]?.photos?.[0];
      if (firstPhoto) setActivePhoto(firstPhoto);
    }).finally(() => setLoading(false));
  }, [slug]);

  const toggleSave = useCallback(async () => {
    if (!profile) return;
    const was = isSaved;
    setIsSaved(!was);
    try {
      if (was) await apiFetch(`/favorites/${profile.id}`, { method: "DELETE" });
      else await apiFetch(`/favorites/${profile.id}`, { method: "POST" });
    } catch {
      setIsSaved(was);
    }
  }, [profile, isSaved]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setReviewSending(true);
    setReviewError(null);
    try {
      await apiFetch(`/public/planners/by-slug/${profile.slug}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating: reviewRating, body: reviewBody.trim() }),
      });
      const updated = await apiFetch<Review[]>(`/public/planners/by-slug/${profile.slug}/reviews`).catch(() => reviews);
      setReviews(updated);
      setReviewSuccess(true);
      setReviewOpen(false);
      setReviewBody("");
      setReviewRating(5);
    } catch (err) {
      const apiErr = err as Error & { status?: number };
      if (apiErr.status === 409) setReviewError("You've already reviewed this planner.");
      else if (apiErr.status === 403) setReviewError("Only clients can leave reviews.");
      else setReviewError("Something went wrong. Please try again.");
    } finally {
      setReviewSending(false);
    }
  }

  function openContact() {
    setMessageSent(false);
    setContactError(null);
    setContactEventDate("");
    setContactNote("");
    setContactOpen(true);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setContactSending(true);
    setContactError(null);
    try {
      // Build a structured message including event details + the user's note
      const parts: string[] = [];
      if (contactEventType) parts.push(`Event type: ${contactEventType}`);
      if (contactGuestCount) parts.push(`Guest count: ${contactGuestCount}`);
      if (contactPhone) parts.push(`Phone: ${contactPhone}`);
      if (contactNote.trim()) parts.push(`\n${contactNote.trim()}`);
      const fullMessage = parts.join("\n");

      await apiFetch("/inquiries", {
        method: "POST",
        body: JSON.stringify({
          planner_profile_id: profile.id,
          client_segment: "individual",
          event_date: contactEventDate || null,
          message: fullMessage,
          intake_payload: {
            event_kind: contactEventType || "event",
            guest_count: contactGuestCount || null,
            phone: contactPhone || null,
          },
        }),
      });
      setMessageSent(true);
      setContactOpen(false);
      // Auto-save to wishlist when a message is sent (ignore if already saved)
      apiFetch(`/favorites/${profile.id}`, { method: "POST" }).catch(() => {});
    } catch (err) {
      const apiErr = err as Error & { status?: number };
      if (apiErr.status === 403 || apiErr.status === 401) {
        setContactError("Only client accounts can send inquiries. Please log in with a client account to contact this planner.");
      } else {
        setContactError("Something went wrong. Please try again.");
      }
    } finally {
      setContactSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-zinc-300" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a8 8 0 000 16v-4a8 8 0 01-8-8z" />
        </svg>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-lg font-medium text-zinc-700">Planner not found</p>
        <Link href="/browse" className="mt-4 inline-block text-sm text-rose-700 underline">Browse all planners</Link>
      </div>
    );
  }

  const allPhotos = portfolio.flatMap((p) => p.photos).filter(Boolean);
  // isOwn is true only when the visitor's own planner profile slug matches
  // the page slug. Checking role alone is not sufficient — Bob is also a
  // planner, so we must compare his profile slug specifically.
  const isOwn = myPlannerSlug !== null && myPlannerSlug === slug;

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link href="/browse" className="hover:text-zinc-800">Browse</Link>
        <span>›</span>
        <span className="text-zinc-800">{profile.display_name ?? profile.slug}</span>
      </nav>

      {/* Hero */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
        {/* Cover photo */}
        <div className="w-full flex-shrink-0 overflow-hidden rounded-2xl bg-zinc-100 sm:w-72">
          {activePhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activePhoto} alt={profile.display_name ?? "Planner"} className="h-60 w-full object-cover sm:h-72" />
          ) : (
            <div className="flex h-60 w-full items-center justify-center sm:h-72">
              <svg viewBox="0 0 48 48" className="h-16 w-16 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="24" cy="18" r="8" />
                <path d="M8 42c0-8.8 7.2-16 16-16s16 7.2 16 16" />
              </svg>
            </div>
          )}
        </div>

        {/* Profile meta */}
        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {profile.display_name ?? "Eventsee Planner"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <p className="text-sm text-zinc-500">{profile.location_text}</p>
              {profile.instagram_url && (
                <a
                  href={
                    profile.instagram_url.startsWith("http")
                      ? profile.instagram_url
                      : `https://instagram.com/${profile.instagram_url.replace(/^@/, "")}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-[#E1306C]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                  </svg>
                  {profile.instagram_url.startsWith("http")
                    ? profile.instagram_url.replace(/.*instagram\.com\//, "@")
                    : profile.instagram_url.startsWith("@")
                    ? profile.instagram_url
                    : `@${profile.instagram_url}`}
                </a>
              )}
            </div>
          </div>

          {profile.avg_rating != null && profile.review_count > 0 && (
            <div className="flex items-center gap-2">
              <Stars value={profile.avg_rating} />
              <span className="text-sm text-zinc-600">
                {profile.avg_rating.toFixed(1)} ({profile.review_count} review{profile.review_count !== 1 ? "s" : ""})
              </span>
            </div>
          )}

          <p className="text-sm font-medium text-zinc-800">
            Starting at{" "}
            <span className="text-zinc-900">${profile.price_min.toLocaleString()}</span>
            {profile.price_max > profile.price_min && (
              <> – ${profile.price_max.toLocaleString()}</>
            )}
          </p>

          {profile.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.specialties.map((s) => (
                <span key={s} className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
                  {SPECIALTY_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            {isOwn ? (
              <Link
                href="/my-business"
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
              >
                Edit my profile
              </Link>
            ) : me?.role === "planner" ? (
              /* Another planner viewing this profile — show a friendly Oops pill */
              <button
                type="button"
                onClick={openContact}
                className="rounded-full bg-rose-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-800"
              >
                Contact Me
              </button>
            ) : (
              <button
                type="button"
                onClick={openContact}
                className="rounded-full bg-rose-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-800"
              >
                Contact Me
              </button>
            )}
            {!isOwn && (
              <button
                type="button"
                onClick={toggleSave}
                className={[
                  "flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition",
                  isSaved
                    ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "border-zinc-300 text-zinc-700 hover:border-zinc-900",
                ].join(" ")}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20.5s-7.5-4.6-9.4-9.2A5.2 5.2 0 0 1 12 5.6a5.2 5.2 0 0 1 9.4 5.7C19.5 15.9 12 20.5 12 20.5z" />
                </svg>
                {isSaved ? "Saved" : "Save"}
              </button>
            )}
          </div>

          {messageSent && (
            <p className="text-sm font-medium text-emerald-700">
              Message sent! The planner will be in touch soon.
            </p>
          )}
        </div>
      </div>

      {/* About */}
      {profile.bio && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">About</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-700">{profile.bio}</p>
        </section>
      )}

      {/* Services */}
      {(profile.planning_styles.length > 0 || profile.event_sizes.length > 0) && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Services</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {profile.planning_styles.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Planning styles</h3>
                <ul className="space-y-1">
                  {profile.planning_styles.map((s) => (
                    <li key={s} className="flex items-center gap-2 text-sm text-zinc-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {STYLE_LABELS[s] ?? s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {profile.event_sizes.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Event sizes</h3>
                <ul className="space-y-1">
                  {profile.event_sizes.map((s) => (
                    <li key={s} className="flex items-center gap-2 text-sm text-zinc-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {SIZE_LABELS[s] ?? s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Photos */}
      {allPhotos.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">Photos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {allPhotos.slice(0, 9).map((photo, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActivePhoto(photo)}
                className={[
                  "overflow-hidden rounded-xl border-2 transition hover:opacity-90",
                  activePhoto === photo ? "border-rose-500" : "border-transparent",
                ].join(" ")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={`Portfolio photo ${i + 1}`} className="h-32 w-full object-cover sm:h-40" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Availability */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Availability</h2>
        <p className="text-sm text-zinc-500">
          Green dates are open. Grey dates the planner has marked as unavailable.
        </p>
        <AvailabilityCalendar blocks={blocks} />
      </section>

      {/* Reviews */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Reviews</h2>

        {/* ── Rating overview ── */}
        {(() => {
          const avg = reviews.length
            ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
            : null;
          const dist = [5, 4, 3, 2, 1].map((star) => ({
            star,
            count: reviews.filter((r) => r.rating === star).length,
            pct: reviews.length
              ? Math.round((reviews.filter((r) => r.rating === star).length / reviews.length) * 100)
              : 0,
          }));

          return (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                {/* Left — big number */}
                <div className="flex flex-col items-center gap-1 sm:w-48 sm:shrink-0">
                  {avg !== null ? (
                    <>
                      <span className="text-5xl font-bold text-zinc-900">{avg.toFixed(1)}</span>
                      <span className="text-sm text-zinc-400">out of 5.0</span>
                      <Stars value={Math.round(avg)} />
                      <span className="mt-1 text-sm text-zinc-500">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
                    </>
                  ) : (
                    <span className="text-sm text-zinc-400">No reviews yet</span>
                  )}

                  {/* Write a review — clients only */}
                  {me?.role === "client" && !reviewSuccess && (
                    <button
                      type="button"
                      onClick={() => setReviewOpen(true)}
                      className="mt-3 rounded-full border-2 px-5 py-2 text-sm font-semibold transition hover:bg-rose-50"
                      style={{ borderColor: "#e11d48", color: "#e11d48" }}
                    >
                      Write a review
                    </button>
                  )}
                  {reviewSuccess && (
                    <span className="mt-3 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-medium text-emerald-700">
                      ✓ Review submitted
                    </span>
                  )}
                  {!me && (
                    <a
                      href="/login"
                      className="mt-3 rounded-full border-2 px-5 py-2 text-sm font-semibold transition hover:bg-rose-50"
                      style={{ borderColor: "#e11d48", color: "#e11d48" }}
                    >
                      Sign in to review
                    </a>
                  )}
                </div>

                {/* Right — star bars */}
                <div className="flex-1 space-y-2">
                  {dist.map(({ star, pct }) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="w-12 shrink-0 text-right text-xs text-zinc-500">{star} Star</span>
                      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="absolute left-0 top-0 h-full rounded-full bg-zinc-800 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-xs text-zinc-500">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust note */}
              <div className="mt-5 flex items-start gap-3 border-t border-zinc-100 pt-4">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <p className="text-xs text-zinc-500">
                  We believe in the full picture — we show every review that complies with our{" "}
                  <span className="underline cursor-pointer">reviews policy</span>, regardless of rating.
                </p>
              </div>

            </div>
          );
        })()}

        {/* ── Individual reviews ── */}
        {reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
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
                        <Stars value={r.rating} />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      {new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
                    </p>
                    {r.body && <p className="mt-2 text-sm leading-relaxed text-zinc-700">{r.body}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Write a review modal ── */}
      {reviewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div className="flex min-h-full items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setReviewOpen(false); }}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-900">Write a review</h3>
                <button type="button" onClick={() => setReviewOpen(false)} className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={submitReview} className="space-y-4">
                {/* Star selector */}
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-2">Your rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="text-2xl transition hover:scale-110"
                      >
                        <span style={{ color: star <= reviewRating ? "#FBBF24" : "#D1D5DB" }}>★</span>
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block text-xs font-medium text-zinc-700">
                  Your review
                  <textarea
                    rows={4}
                    required
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                    placeholder="Share your experience with this planner…"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
                  />
                </label>
                {reviewError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{reviewError}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setReviewOpen(false)} className="flex-1 rounded-full border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Cancel</button>
                  <button type="submit" disabled={reviewSending} className="flex-1 rounded-full bg-rose-700 py-2.5 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-50">
                    {reviewSending ? "Submitting…" : "Submit review"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Contact modal */}
      {contactOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
          <div
            className="flex min-h-full items-end justify-center p-4 sm:items-center"
            onClick={(e) => { if (e.target === e.currentTarget) setContactOpen(false); }}
          >
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="p-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">
                  Contact {profile.display_name ?? "the planner"}
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Share your event details and we&apos;ll put you in touch.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setContactOpen(false)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {me?.role === "planner" ? (
              /* Planner-to-planner: can't send inquiries */
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "#FFF3E0" }}>
                  <span className="text-2xl">🙈</span>
                </div>
                <div>
                  <p className="text-base font-semibold text-zinc-900">
                    Oops, you&apos;re a business!
                  </p>
                  <p className="mt-1.5 text-sm text-zinc-500">
                    You can&apos;t contact another business at this time. Switch to a client account to reach out to planners.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setContactOpen(false)}
                  className="mt-1 rounded-full border border-zinc-300 px-6 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-500"
                >
                  Got it
                </button>
              </div>
            ) : me ? (
              <form onSubmit={sendMessage} className="space-y-4">
                {/* Hint if any fields were auto-filled */}
                {(contactEventType || contactGuestCount || contactPhone) && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Auto-filled from your profile — edit anything below.
                  </div>
                )}

                {/* Name row */}
                <div className="flex gap-3">
                  <label className="flex-1 block text-xs font-medium text-zinc-700">
                    First name
                    <input
                      required
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      value={contactFirstName}
                      onChange={(e) => setContactFirstName(e.target.value)}
                      placeholder="Jane"
                    />
                  </label>
                  <label className="flex-1 block text-xs font-medium text-zinc-700">
                    Last name
                    <input
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      value={contactLastName}
                      onChange={(e) => setContactLastName(e.target.value)}
                      placeholder="Doe"
                    />
                  </label>
                </div>

                {/* Phone */}
                <label className="block text-xs font-medium text-zinc-700">
                  Phone number <span className="font-normal text-zinc-400">(optional)</span>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="(555) 867-5309"
                  />
                </label>

                {/* Event type + guest count row */}
                <div className="flex gap-3">
                  <label className="flex-1 block text-xs font-medium text-zinc-700">
                    Event type
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      value={contactEventType}
                      onChange={(e) => setContactEventType(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {["Wedding","Corporate","Birthday","Micro-wedding","Anniversary","Baby Shower","Graduation","Conference","Retreat","Gala","Other"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex-1 block text-xs font-medium text-zinc-700">
                    Guest count
                    <select
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      value={contactGuestCount}
                      onChange={(e) => setContactGuestCount(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {["Under 50 guests","50–150 guests","150–300 guests","300+ guests"].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Availability calendar — client picks event date */}
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-700">
                    What&apos;s the date of your event?
                  </p>
                  <p className="mb-3 text-[11px] text-zinc-400">
                    Green = available &nbsp;·&nbsp; Grey = unavailable &nbsp;·&nbsp; Click a date to select it.
                  </p>
                  <AvailabilityCalendar
                    blocks={blocks}
                    selectable
                    selectedDate={contactEventDate}
                    onSelect={(date) => setContactEventDate(date)}
                  />
                  {contactEventDate && (
                    <p className="mt-2 text-xs text-zinc-600">
                      Selected:{" "}
                      <span className="font-medium text-zinc-900">
                        {new Date(contactEventDate + "T12:00:00").toLocaleDateString(undefined, {
                          weekday: "long", year: "numeric", month: "long", day: "numeric",
                        })}
                      </span>
                      {blocks.some((b) => {
                        const d = new Date(contactEventDate + "T12:00:00");
                        return d >= new Date(b.start_ts) && d < new Date(b.end_ts);
                      }) && (
                        <span className="ml-1.5 font-medium text-amber-600">
                          — planner may be unavailable on this date
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <label className="block text-xs font-medium text-zinc-700">
                  Additional notes <span className="font-normal text-zinc-400">(optional)</span>
                  <textarea
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    placeholder="Share your vision, style, venue ideas, or anything else…"
                    value={contactNote}
                    onChange={(e) => setContactNote(e.target.value)}
                  />
                </label>

                {contactError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{contactError}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={contactSending}
                    className="flex-1 rounded-full bg-rose-700 py-2.5 text-sm font-medium text-white hover:bg-rose-800 disabled:opacity-60"
                  >
                    {contactSending ? "Sending…" : "Send message"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactOpen(false)}
                    className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm text-zinc-600 hover:border-zinc-900"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-sm text-zinc-600">
                  You need to be logged in to contact a planner.
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/login"
                    className="flex-1 rounded-full bg-rose-700 py-2.5 text-center text-sm font-medium text-white hover:bg-rose-800"
                  >
                    Log in
                  </Link>
                  <button
                    type="button"
                    onClick={() => setContactOpen(false)}
                    className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm text-zinc-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
