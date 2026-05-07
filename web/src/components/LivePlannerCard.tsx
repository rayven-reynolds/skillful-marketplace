"use client";

import Link from "next/link";
import { useState } from "react";

/* ─── Shared planner types ──────────────────────────────── */
export type PlannerPublicBase = {
  id: string;
  slug: string;
  display_name: string | null;
  bio: string;
  location_text: string;
  price_min: number;
  price_max: number;
  specialties: string[];
  planning_styles: string[];
  event_sizes: string[];
  avg_rating: number | null;
  review_count: number;
  is_premium: boolean;
  instagram_url?: string | null;
};

/** A planner enriched with all portfolio photos for the card carousel. */
export type LivePlanner = PlannerPublicBase & { photos: string[] };

/* ─── Login modal ───────────────────────────────────────── */
export function LoginModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mb-5 flex justify-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "#FFF0F3" }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="#e11d48"
              stroke="#e11d48"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20.5s-7.5-4.6-9.4-9.2A5.2 5.2 0 0 1 12 5.6a5.2 5.2 0 0 1 9.4 5.7C19.5 15.9 12 20.5 12 20.5z" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-zinc-900">Save this planner</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Log in or create a free account to save planners to your wishlist and get personalized matches.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <Link
            href="/login"
            className="block rounded-full py-3 text-sm font-bold text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #5C7A65, #3D5C4A)" }}
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="block rounded-full border py-3 text-sm font-semibold text-zinc-800 transition hover:border-zinc-900"
            style={{ borderColor: "#C8D8CB" }}
          >
            Create an account
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-400 hover:text-zinc-600"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Card skeleton for loading states ─────────────────── */
export function CardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="aspect-[4/3] animate-pulse bg-zinc-100" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-zinc-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
        <div className="mt-auto h-7 animate-pulse rounded-full bg-zinc-100" />
      </div>
    </div>
  );
}

/* ─── Live planner card with carousel ───────────────────── */
export function LivePlannerCard({
  planner,
  isSaved,
  isLoggedIn,
  onToggleSave,
  contacted = false,
  cta,
}: {
  planner: LivePlanner;
  isSaved: boolean;
  isLoggedIn: boolean | null;
  onToggleSave: (id: string) => void;
  /** Show a green "Contacted" badge — used on the wishlist page */
  contacted?: boolean;
  /** Override the default "Contact Me" CTA. Pass a React node to render in its place. */
  cta?: React.ReactNode;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const photos = planner.photos.length > 0 ? planner.photos : [];
  const hasPhotos = photos.length > 0;

  function prev(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPhotoIdx((i) => (i - 1 + photos.length) % photos.length);
  }

  function next(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPhotoIdx((i) => (i + 1) % photos.length);
  }

  function handleHeart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    onToggleSave(planner.id);
  }

  return (
    <>
      <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
        {/* Stretched link — covers the whole card; interactive elements sit above via z-index */}
        <Link
          href={`/planners/${planner.slug}`}
          className="absolute inset-0 z-[1]"
          aria-label={`View ${planner.display_name ?? "planner"} profile`}
        />

        {/* Carousel / cover */}
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
          {hasPhotos ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photos[photoIdx]}
              alt={planner.display_name ?? "Planner"}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg
                viewBox="0 0 48 48"
                className="h-12 w-12 text-zinc-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="24" cy="18" r="8" />
                <path d="M8 42c0-8.8 7.2-16 16-16s16 7.2 16 16" />
              </svg>
            </div>
          )}

          {/* Prev / Next arrows */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 z-[2] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow opacity-0 transition group-hover:opacity-100"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-700" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 z-[2] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow opacity-0 transition group-hover:opacity-100"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-700" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}

          {/* Contacted badge */}
          {contacted && (
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Contacted
            </span>
          )}

          {/* Heart */}
          <button
            type="button"
            aria-label={isSaved ? "Unsave planner" : "Save planner"}
            onClick={handleHeart}
            className="absolute right-3 top-3 z-[2] flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow transition hover:scale-110"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill={isSaved ? "#e11d48" : "none"}
              stroke={isSaved ? "#e11d48" : "#71717a"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20.5s-7.5-4.6-9.4-9.2A5.2 5.2 0 0 1 12 5.6a5.2 5.2 0 0 1 9.4 5.7C19.5 15.9 12 20.5 12 20.5z" />
            </svg>
          </button>

          {/* Featured badge */}
          {planner.is_premium && (
            <span
              className="absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
              style={{ background: "rgba(15,28,18,0.78)", backdropFilter: "blur(6px)" }}
            >
              Featured
            </span>
          )}

          {/* Photo dot indicators */}
          {photos.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 z-[2] flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }}
                  className={[
                    "h-1.5 rounded-full transition-all",
                    i === photoIdx ? "w-4 bg-white" : "w-1.5 bg-white/60",
                  ].join(" ")}
                />
              ))}
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div>
            <h3 className="truncate text-sm font-semibold text-zinc-900">
              {planner.display_name ?? "Eventsee Planner"}
            </h3>
            <p className="truncate text-xs text-zinc-500">{planner.location_text}</p>
          </div>

          {planner.avg_rating != null && planner.review_count > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <span style={{ color: "#3D5C4A" }}>★ {planner.avg_rating.toFixed(1)}</span>
              <span className="text-zinc-400">({planner.review_count} reviews)</span>
            </div>
          )}

          <p className="text-xs text-zinc-700">
            Starting at{" "}
            <span className="font-semibold text-zinc-900">
              ${planner.price_min.toLocaleString()}
            </span>
          </p>

          {planner.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {planner.specialties.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize"
                  style={{ background: "#EDF4EF", color: "#3D5C4A", borderColor: "#C8D8CB" }}
                >
                  {tag.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}

      {/* Instagram link */}
      {planner.instagram_url && (
        <a
          href={
            planner.instagram_url.startsWith("http")
              ? planner.instagram_url
              : `https://instagram.com/${planner.instagram_url.replace(/^@/, "")}`
          }
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="relative z-[2] flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          {/* Instagram icon */}
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
          </svg>
          @{planner.instagram_url.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/^@/, "").replace(/\/$/, "")}
        </a>
      )}

      <div className="relative z-[2] mt-auto pt-1">
        {cta ?? (
          <Link
            href={`/planners/${planner.slug}`}
            className="block rounded-full py-1.5 text-center text-xs font-semibold text-white transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #5C7A65, #3D5C4A)" }}
          >
            Contact Me
          </Link>
        )}
      </div>
        </div>
      </article>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </>
  );
}
