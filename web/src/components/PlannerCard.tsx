"use client";

import Link from "next/link";

export type PlannerCardData = {
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
  /** First photo from the first portfolio item (if any). */
  cover_photo?: string | null;
  /** Instagram handle or URL (optional). */
  instagram_url?: string | null;
};

type Props = {
  planner: PlannerCardData;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  isOwn?: boolean;
};


function StarRating({ value, count }: { value: number; count: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="flex items-center gap-1 text-xs text-zinc-600">
      <span className="flex text-amber-400">
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} viewBox="0 0 16 16" className="h-3.5 w-3.5" fill={i < full ? "currentColor" : half && i === full ? "url(#half)" : "none"} stroke="currentColor" strokeWidth="1.5">
            <defs>
              <linearGradient id="half" x1="0" x2="1" y1="0" y2="0">
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="white" />
              </linearGradient>
            </defs>
            <polygon points="8,1.5 10,5.8 15,6.3 11.5,9.6 12.5,14.5 8,12 3.5,14.5 4.5,9.6 1,6.3 6,5.8" />
          </svg>
        ))}
      </span>
      <span>{value.toFixed(1)}</span>
      <span className="text-zinc-400">({count})</span>
    </span>
  );
}

export function PlannerCard({ planner, isSaved = false, onToggleSave, isOwn = false }: Props) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Cover image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        {planner.cover_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={planner.cover_photo}
            alt={planner.display_name ?? "Planner"}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg viewBox="0 0 48 48" className="h-12 w-12 text-zinc-300" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="24" cy="18" r="8" />
              <path d="M8 42c0-8.8 7.2-16 16-16s16 7.2 16 16" />
            </svg>
          </div>
        )}

        {/* Save heart */}
        {onToggleSave && (
          <button
            type="button"
            aria-label={isSaved ? "Unsave planner" : "Save planner"}
            onClick={(e) => { e.preventDefault(); onToggleSave(planner.id); }}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow transition hover:scale-110"
          >
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill={isSaved ? "#e11d48" : "none"} stroke={isSaved ? "#e11d48" : "#71717a"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20.5s-7.5-4.6-9.4-9.2A5.2 5.2 0 0 1 12 5.6a5.2 5.2 0 0 1 9.4 5.7C19.5 15.9 12 20.5 12 20.5z" />
            </svg>
          </button>
        )}

        {/* Boosted/featured badge — only for is_premium planners */}
        {planner.is_premium && (
          <span
            className="absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
            style={{ background: "rgba(15,28,18,0.78)", backdropFilter: "blur(6px)" }}
          >
            Featured
          </span>
        )}

        {/* Own listing badge */}
        {isOwn && (
          <span className="absolute bottom-3 left-3 rounded-full bg-sage-dark px-2.5 py-0.5 text-[11px] font-semibold text-white shadow">
            Your listing
          </span>
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
          <StarRating value={planner.avg_rating} count={planner.review_count} />
        )}

        <div className="mt-auto flex items-center justify-between">
          <p className="text-xs text-zinc-700">
            From{" "}
            <span className="font-semibold text-zinc-900">
              ${planner.price_min.toLocaleString()}
            </span>
          </p>
          {planner.instagram_url && (
            <a
              href={planner.instagram_url.startsWith("http") ? planner.instagram_url : `https://instagram.com/${planner.instagram_url.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              onClick={(e) => e.stopPropagation()}
              className="text-zinc-400 transition hover:text-[#E1306C]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
              </svg>
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="mt-2 flex gap-2">
          <Link
            href={`/planners/${planner.slug}`}
            className="flex-1 rounded-full border border-zinc-300 py-1.5 text-center text-xs font-medium text-zinc-800 transition hover:border-zinc-900 hover:text-zinc-900"
          >
            Contact Me
          </Link>
          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(planner.id)}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                isSaved
                  ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  : "border-zinc-300 text-zinc-600 hover:border-zinc-900",
              ].join(" ")}
            >
              {isSaved ? "Saved" : "Save"}
            </button>
          )}
          {isOwn && (
            <Link
              href="/my-business"
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
            >
              Edit
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
