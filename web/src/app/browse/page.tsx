"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BrowseFilters } from "@/components/BrowseFilters";
import { LivePlannerCard, CardSkeleton, type LivePlanner } from "@/components/LivePlannerCard";
import { apiFetch } from "@/lib/api";

/* ── types ──────────────────────────────────────────────── */
type PlannerPublic = LivePlanner;  // LivePlanner = PlannerPublicBase & { photos: string[] }

type PortfolioItem = { id: string; photos: string[] };
type Favourite    = { planner_profile_id: string };
type InquiryRow   = { planner_profile_id: string };

/* ── View Conversation CTA ───────────────────────────────── */
function ViewConversationCta() {
  return (
    <Link
      href="/wishlist"
      onClick={(e) => e.stopPropagation()}
      className="relative z-[2] block w-full rounded-full py-1.5 text-center text-xs font-semibold text-white transition hover:opacity-90"
      style={{ background: "linear-gradient(135deg, #b45309, #78350f)" }}
    >
      View Conversation
    </Link>
  );
}

/* ── helpers ─────────────────────────────────────────────── */

/**
 * Returns the upper price boundary for a budget filter value.
 * Used client-side to split planners into within-budget / over-budget groups.
 */
function getBudgetMax(budget: string): number {
  switch (budget) {
    case "budget":  return 1_000;
    case "mid":     return 5_000;
    case "premium": return 10_000;
    case "luxury":  return Infinity;
    default:        return Infinity;
  }
}

function buildApiUrl(params: URLSearchParams): string {
  const q = new URLSearchParams();
  const rawEventType = params.get("event_type") || params.get("eventType");
  // Single event type → server-side filter; multiple → client-side after full fetch
  if (rawEventType && !rawEventType.includes(",")) {
    q.set("specialties", rawEventType);
  }
  const rawServices = params.get("services");
  // Single service → server-side; multiple → client-side
  if (rawServices && !rawServices.includes(",")) {
    q.set("planning_styles", rawServices);
  }
  const location = params.get("location");
  if (location) q.set("location", location);
  // Budget and guest count are intentionally NOT passed to the API —
  // budget splits results client-side; guest count never filters planners out.
  const date = params.get("date");
  if (date) {
    q.set("event_date", date);
    q.set("available_only", "true");
  }
  return `/public/planners${q.toString() ? `?${q}` : ""}`;
}

/** True when the URL has at least one meaningful filter applied */
function hasFilters(params: URLSearchParams): boolean {
  return ["q", "event_type", "eventType", "services", "location", "budget", "guests", "date"]
    .some((k) => !!params.get(k) && params.get(k) !== "");
}

/** Client-side filter by name query */
function filterByQuery(planners: LivePlanner[], q: string): LivePlanner[] {
  if (!q.trim()) return planners;
  const lower = q.toLowerCase();
  return planners.filter(
    (p) =>
      (p.display_name ?? "").toLowerCase().includes(lower) ||
      p.location_text.toLowerCase().includes(lower) ||
      p.specialties.some((s) => s.toLowerCase().includes(lower))
  );
}



/* ── "If You Flex Your Budget" section ──────────────────── */
function FlexBudgetSection({
  planners,
  savedIds,
  contactedIds,
  isLoggedIn,
  onToggleSave,
}: {
  planners: LivePlanner[];
  savedIds: Set<string>;
  contactedIds: Set<string>;
  isLoggedIn: boolean | null;
  onToggleSave: (id: string) => void;
}) {
  if (planners.length === 0) return null;
  const sorted = [...planners].sort((a, b) => a.price_min - b.price_min).slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[18px]">💰</span>
            <h2 className="text-[18px] font-bold text-dark-text">If You Flex Your Budget</h2>
          </div>
          <p className="mt-0.5 text-[13px] text-muted-text">
            These planners are above your selected range but may be worth it — starting prices shown.
          </p>
        </div>
      </div>

      <div
        className="flex items-start gap-3 rounded-2xl border px-5 py-3.5"
        style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}
      >
        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <circle cx="12" cy="16" r="0.5" fill="#D97706" />
        </svg>
        <p className="text-[13px]" style={{ color: "#92400E" }}>
          The planners below start above your budget. Many offer flexible packages — reaching out costs nothing.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((p) => (
          <LivePlannerCard
            key={p.id}
            planner={p}
            isSaved={savedIds.has(p.id)}
            isLoggedIn={isLoggedIn}
            onToggleSave={onToggleSave}
            cta={contactedIds.has(p.id) ? <ViewConversationCta /> : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Main browse component ───────────────────────────────── */
function BrowsePlanners() {
  const params = useSearchParams();
  const filtersActive = hasFilters(params);

  const [allPlanners, setAllPlanners]   = useState<PlannerPublic[]>([]);
  const [allPhotos, setAllPhotos]       = useState<Record<string, string[]>>({});
  const [savedIds, setSavedIds]         = useState<Set<string>>(new Set());
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());
  const [isLoggedIn, setIsLoggedIn]     = useState<boolean | null>(null);
  const [loading, setLoading]           = useState(true);
  const [userCity, setUserCity]         = useState<string | null>(null);

  /* Geo-detect city on first load */
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude: lat, longitude: lon } = pos.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
            const data = await res.json() as { address?: { city?: string; town?: string; county?: string } };
            const city = data.address?.city || data.address?.town || data.address?.county || null;
            setUserCity(city);
          } catch { /* silently ignore */ }
        },
        () => { /* permission denied — silently ignore */ },
        { timeout: 5000 }
      );
    }
  }, []);

  /* Fetch planners when filters change */
  useEffect(() => {
    setLoading(true);
    const url = buildApiUrl(params);
    apiFetch<PlannerPublic[]>(url)
      .then(setAllPlanners)
      .catch(() => setAllPlanners([]))
      .finally(() => setLoading(false));
  }, [params]);

  /* Fetch all portfolio photos for each planner */
  useEffect(() => {
    for (const p of allPlanners) {
      apiFetch<PortfolioItem[]>(`/public/planners/by-slug/${p.slug}/portfolio`)
        .then((items) => {
          const photos = items.flatMap((item) => item.photos).filter(Boolean);
          if (photos.length > 0) setAllPhotos((prev) => ({ ...prev, [p.id]: photos }));
        })
        .catch(() => {});
    }
  }, [allPlanners]);

  /* Load auth state + saved IDs + contacted IDs */
  useEffect(() => {
    apiFetch<{ id: string; role: string }>("/auth/me")
      .then(() => {
        setIsLoggedIn(true);
        Promise.all([
          apiFetch<Favourite[]>("/favorites").catch(() => [] as Favourite[]),
          apiFetch<InquiryRow[]>("/inquiries/mine").catch(() => [] as InquiryRow[]),
        ]).then(([favs, inquiries]) => {
          setSavedIds(new Set(favs.map((f) => f.planner_profile_id)));
          setContactedIds(new Set(inquiries.map((i) => i.planner_profile_id)));
        });
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  const toggleSave = useCallback(
    async (plannerProfileId: string) => {
      const was = savedIds.has(plannerProfileId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (was) next.delete(plannerProfileId); else next.add(plannerProfileId);
        return next;
      });
      try {
        if (was) await apiFetch(`/favorites/${plannerProfileId}`, { method: "DELETE" });
        else     await apiFetch(`/favorites/${plannerProfileId}`, { method: "POST" });
      } catch {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (was) next.add(plannerProfileId); else next.delete(plannerProfileId);
          return next;
        });
      }
    },
    [savedIds],
  );

  const q = params.get("q") ?? "";
  const rawEventType = params.get("event_type") || params.get("eventType") || "";
  const selectedEventTypes = rawEventType ? rawEventType.split(",").filter(Boolean) : [];
  const rawServices = params.get("services") ?? "";
  const selectedServices = rawServices ? rawServices.split(",").filter(Boolean) : [];
  const selectedBudget = params.get("budget") ?? "";
  // Guest count is collected in the filter bar for UX context but intentionally
  // never filters planners out of results.

  const allCards: LivePlanner[] = allPlanners.map((p) => ({
    ...p,
    photos: allPhotos[p.id] ?? [],
  }));

  // Client-side multi-type filter for event types
  const typeFiltered =
    selectedEventTypes.length > 1
      ? allCards.filter((p) => p.specialties.some((s) => selectedEventTypes.includes(s)))
      : allCards;

  // Client-side multi-select filter for services/planning styles
  const serviceFiltered =
    selectedServices.length > 1
      ? typeFiltered.filter((p) => p.planning_styles.some((s) => selectedServices.includes(s)))
      : typeFiltered;

  const queryFiltered = filterByQuery(serviceFiltered, q);

  // Budget split: within-budget = normal results; over-budget = "Flex Your Budget" section
  // Guest count does NOT filter planners out — it's informational only.
  const budgetMax = getBudgetMax(selectedBudget);
  const withinBudget = selectedBudget
    ? queryFiltered.filter((p) => p.price_min <= budgetMax)
    : queryFiltered;
  const overBudget = selectedBudget
    ? queryFiltered.filter((p) => p.price_min > budgetMax)
    : [];

  // `cards` = planners shown in the primary sections
  const cards = withinBudget;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="h-5 w-48 animate-pulse rounded bg-zinc-100" />
            <div className="mt-1.5 h-3.5 w-64 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  /* ── No filters active: show top 3 by location ── */
  if (!filtersActive) {
    const top3 = [...allCards]
      .sort((a, b) => {
        const ra = (a.avg_rating ?? 0) * Math.log1p(a.review_count);
        const rb = (b.avg_rating ?? 0) * Math.log1p(b.review_count);
        return rb - ra;
      })
      .slice(0, 3);

    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-dark-text">
              {q
                ? `Results for "${q}"`
                : `Top planners${userCity ? ` near ${userCity}` : " near you"}`}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-text">
              {q ? "Matching planners by name, location, or specialty." : "Ranked by reviews. Apply filters above to see more options."}
            </p>
          </div>
          <Link href="/browse?sort=reviews" className="flex items-center gap-1 text-sm font-semibold" style={{ color: "#3D5C4A" }}>
            See all
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {top3.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 py-20 text-center">
            <p className="text-zinc-500">No planners available yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {top3.map((p) => (
              <LivePlannerCard
                key={p.id}
                planner={p}
                isSaved={savedIds.has(p.id)}
                isLoggedIn={isLoggedIn}
                onToggleSave={toggleSave}
                cta={contactedIds.has(p.id) ? <ViewConversationCta /> : undefined}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Filters active: flat deduplicated list ── */

  // Sort by rating score, deduped (each planner appears exactly once)
  const sortedCards = [...cards].sort((a, b) => {
    const ra = (a.avg_rating ?? 0) * Math.log1p(a.review_count);
    const rb = (b.avg_rating ?? 0) * Math.log1p(b.review_count);
    return rb - ra;
  });

  /* No within-budget matches at all — show all planners as fallback */
  if (sortedCards.length === 0 && overBudget.length === 0) {
    const fallback = [...allCards].sort((a, b) => {
      const ra = (a.avg_rating ?? 0) * Math.log1p(a.review_count);
      const rb = (b.avg_rating ?? 0) * Math.log1p(b.review_count);
      return rb - ra;
    });
    return (
      <div className="space-y-8">
        <div
          className="flex items-start gap-4 rounded-2xl border px-6 py-5"
          style={{ background: "#FFF9EC", borderColor: "#F0D88A" }}
        >
          <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="#B87A00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <circle cx="12" cy="16" r="0.5" fill="#B87A00" />
          </svg>
          <div>
            <p className="text-sm font-semibold" style={{ color: "#7A5200" }}>No exact matches for your filters</p>
            <p className="mt-0.5 text-sm" style={{ color: "#9A6800" }}>Showing all available planners — try adjusting your filters.</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.href = "/browse"}
            className="ml-auto shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition hover:bg-amber-100"
            style={{ borderColor: "#F0D88A", color: "#7A5200" }}
          >
            Clear filters
          </button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {fallback.map((p) => (
            <LivePlannerCard key={p.id} planner={p} isSaved={savedIds.has(p.id)} isLoggedIn={isLoggedIn} onToggleSave={toggleSave}
              cta={contactedIds.has(p.id) ? <ViewConversationCta /> : undefined} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Flat results list — no duplicate categories */}
      {sortedCards.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              <span className="font-semibold text-zinc-900">{sortedCards.length}</span>{" "}
              planner{sortedCards.length !== 1 ? "s" : ""} match your search
            </p>
            <button
              type="button"
              onClick={() => window.location.href = "/browse"}
              className="text-xs font-medium underline underline-offset-2 transition hover:opacity-70"
              style={{ color: "#3D5C4A" }}
            >
              Clear filters
            </button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedCards.map((p) => (
              <LivePlannerCard key={p.id} planner={p} isSaved={savedIds.has(p.id)} isLoggedIn={isLoggedIn} onToggleSave={toggleSave}
                cta={contactedIds.has(p.id) ? <ViewConversationCta /> : undefined} />
            ))}
          </div>
        </div>
      )}

      {/* Over-budget planners — separate encourage section */}
      <FlexBudgetSection
        planners={overBudget}
        savedIds={savedIds}
        contactedIds={contactedIds}
        isLoggedIn={isLoggedIn}
        onToggleSave={toggleSave}
      />
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────── */
export default function BrowsePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      <Suspense>
        <BrowseFilters />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <BrowsePlanners />
      </Suspense>
    </div>
  );
}
