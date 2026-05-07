"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import {
  CardSkeleton,
  LivePlannerCard,
  type LivePlanner,
} from "@/components/LivePlannerCard";
import { BrowseFilters } from "@/components/BrowseFilters";

/* ─── Stats ─────────────────────────────────────────────── */
const STATS = [
  { value: "1,200+", label: "Verified Planners" },
  { value: "48k",    label: "Events Planned" },
  { value: "4.9★",   label: "Avg. Rating" },
  { value: "62",     label: "Cities" },
  { value: "100%",   label: "Verified Reviews" },
  { value: "$0",     label: "To Browse" },
];

/* ─── API types ──────────────────────────────────────────── */
type PlannerPublic = {
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
type PortfolioItem = { id: string; photos: string[] };
type Favourite = { planner_profile_id: string };

/* A planner enriched with portfolio photos for the card carousel */
type HomePlanner = LivePlanner;

/* HomePlannerCard = LivePlannerCard (imported above) */
const HomePlannerCard = LivePlannerCard;

/* ─── Live planner section ───────────────────────────── */
// The slug prop is reserved for future deep-linking; href currently goes to /wishlist
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ViewConversationCta({ slug }: { slug: string }) {
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

function LiveSection({
  title,
  subtitle,
  specialty,
  seeAllHref,
  bg = "white",
  isLoggedIn,
  savedIds,
  contactedIds,
  onToggleSave,
}: {
  title: string;
  subtitle: string;
  specialty?: string;
  seeAllHref: string;
  bg?: "white" | "tint";
  isLoggedIn: boolean | null;
  savedIds: Set<string>;
  contactedIds: Set<string>;
  onToggleSave: (id: string) => void;
}) {
  const [planners, setPlanners] = useState<HomePlanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = specialty
      ? `/public/planners?specialties=${specialty}&limit=3`
      : `/public/planners?limit=3`;

    apiFetch<PlannerPublic[]>(url)
      .then(async (items) => {
        const top3 = items.slice(0, 3);
        // Fetch portfolio photos for each planner in parallel
        const enriched = await Promise.all(
          top3.map(async (p) => {
            try {
              const portfolio = await apiFetch<PortfolioItem[]>(
                `/public/planners/by-slug/${p.slug}/portfolio`
              );
              const photos = portfolio
                .flatMap((item) => item.photos)
                .filter(Boolean)
                .slice(0, 5);
              return { ...p, photos };
            } catch {
              return { ...p, photos: [] };
            }
          })
        );
        setPlanners(enriched);
      })
      .catch(() => setPlanners([]))
      .finally(() => setLoading(false));
  }, [specialty]);

  return (
    <section
      className="w-full"
      style={{ background: bg === "tint" ? "#F5F8F5" : "#ffffff" }}
    >
      <div className="mx-auto max-w-7xl px-12 py-[52px]">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-[26px] font-extrabold leading-tight text-dark-text">
              {title}
            </h2>
            <p className="mt-1.5 text-[15px]" style={{ color: "#6A6F8A" }}>
              {subtitle}
            </p>
          </div>
          <Link
            href={seeAllHref}
            className="flex items-center gap-1 text-sm font-semibold transition hover:opacity-70"
            style={{ color: "#3D5C4A" }}
          >
            See all
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : planners.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-300 py-16 text-center">
            <p className="text-sm text-zinc-500">No planners in this category yet.</p>
            <Link
              href="/browse"
              className="rounded-full px-5 py-2 text-xs font-semibold text-white"
              style={{ background: "#3D5C4A" }}
            >
              Browse all planners
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {planners.map((p) => (
              <HomePlannerCard
                key={p.id}
                planner={p}
                isSaved={savedIds.has(p.id)}
                isLoggedIn={isLoggedIn}
                onToggleSave={onToggleSave}
                cta={contactedIds.has(p.id) ? <ViewConversationCta slug={p.slug} /> : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Page ─────────────────────────────────────────────── */
type InquiryRow = { planner_profile_id: string };

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    apiFetch("/auth/me")
      .then(() => {
        setIsLoggedIn(true);
        return Promise.all([
          apiFetch<Favourite[]>("/favorites"),
          apiFetch<InquiryRow[]>("/inquiries/mine").catch(() => [] as InquiryRow[]),
        ]);
      })
      .then(([favs, inquiries]) => {
        setSavedIds(new Set(favs.map((f) => f.planner_profile_id)));
        setContactedIds(new Set(inquiries.map((i) => i.planner_profile_id)));
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  const toggleSave = useCallback(async (plannerProfileId: string) => {
    const was = savedIds.has(plannerProfileId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (was) next.delete(plannerProfileId);
      else next.add(plannerProfileId);
      return next;
    });
    try {
      if (was) await apiFetch(`/favorites/${plannerProfileId}`, { method: "DELETE" });
      else     await apiFetch(`/favorites/${plannerProfileId}`, { method: "POST" });
    } catch {
      // Revert on failure
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (was) next.add(plannerProfileId);
        else next.delete(plannerProfileId);
        return next;
      });
    }
  }, [savedIds]);

  return (
    <>
      <Suspense fallback={<div className="h-[74px] w-full border-b bg-white" style={{ borderColor: "#DDE8DF" }} />}>
        <BrowseFilters />
      </Suspense>

      <LiveSection
        title="Find Your Planner Today"
        subtitle="Verified professionals across weddings, corporate events, and everything in between."
        seeAllHref="/browse"
        bg="white"
        isLoggedIn={isLoggedIn}
        savedIds={savedIds}
        contactedIds={contactedIds}
        onToggleSave={toggleSave}
      />

      <LiveSection
        title="Top Wedding Planners"
        subtitle="Thoughtful, detail-oriented professionals for your perfect day."
        specialty="wedding"
        seeAllHref="/browse?event_type=wedding"
        bg="tint"
        isLoggedIn={isLoggedIn}
        savedIds={savedIds}
        contactedIds={contactedIds}
        onToggleSave={toggleSave}
      />

      <LiveSection
        title="Top Corporate Planners"
        subtitle="Expert planners for conferences, retreats, galas, and company events."
        specialty="corporate"
        seeAllHref="/browse?event_type=corporate"
        bg="white"
        isLoggedIn={isLoggedIn}
        savedIds={savedIds}
        contactedIds={contactedIds}
        onToggleSave={toggleSave}
      />

      {/* About section */}
      <section className="w-full" style={{ background: "#F5F8F5", padding: "64px 48px" }}>
        <div className="mx-auto max-w-7xl space-y-10">
          <div className="max-w-3xl space-y-5">
            <h2 className="text-[32px] font-bold leading-tight text-dark-text">
              About{" "}
              <span className="font-display italic" style={{ color: "#5C7A65" }}>
                Eventsee
              </span>
            </h2>
            <p className="text-[15px] leading-[1.75]" style={{ color: "#4A6550" }}>
              Eventsee is a curated marketplace connecting people and companies with
              the best event planners in their city. We built it because finding a
              great planner shouldn&apos;t require a dozen cold emails and a leap of faith.
            </p>
            <p className="text-[15px] leading-[1.75]" style={{ color: "#4A6550" }}>
              Every planner on our platform is verified, displays real pricing up
              front, and earns reviews only from confirmed bookings — so you always
              know exactly what you&apos;re getting before you reach out.
            </p>
            <p className="text-[15px] leading-[1.75]" style={{ color: "#4A6550" }}>
              Whether you&apos;re planning an intimate micro-wedding, a 500-person gala,
              or a company offsite, Eventsee surfaces the right professional — quickly,
              transparently, and for free to browse.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-7 text-center"
                style={{
                  border: "1px solid #E2EDE4",
                  boxShadow: "0 1px 6px rgba(61,92,74,0.06)",
                }}
              >
                <span
                  className="text-[28px] font-bold leading-none tracking-tight"
                  style={{ color: "#3D5C4A" }}
                >
                  {s.value}
                </span>
                <span
                  className="mt-2.5 text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "#7A9F80" }}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
