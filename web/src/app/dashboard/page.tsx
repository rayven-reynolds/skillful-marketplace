import Link from "next/link";
import { LocationSearch } from "@/components/LocationSearch";
import { PlannerCard } from "@/components/PlannerCard";
import { PLANNERS } from "@/lib/planners";

const FEATURED_IDS = ["ja", "gn", "nc"] as const;

const EVENT_CHIPS: Array<{ label: string; href: string; icon: React.ReactNode }> = [
  {
    label: "Wedding",
    href: "/browse?eventType=wedding",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 21V8a5 5 0 0 1 10 0v13" />
        <path d="M5 21h14" />
        <path d="M12 3v3" />
      </svg>
    ),
  },
  {
    label: "Corporate Event",
    href: "/browse?eventType=corporate",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V4h6v3" />
      </svg>
    ),
  },
  {
    label: "Birthday Party",
    href: "/browse?eventType=birthday",
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12h14v8H5z" />
        <path d="M3 20h18" />
        <path d="M12 12V7" />
        <path d="M12 5a1.5 1.5 0 0 0-1.5-1.5A1.5 1.5 0 0 0 12 5z" />
      </svg>
    ),
  },
];

const STEPS: Array<{ n: string; title: string; body: string; icon: React.ReactNode }> = [
  {
    n: "01",
    title: "Tell us about your event",
    body: "Answer 7 quick questions about your style, budget, location, and timing.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 12h6" />
        <path d="M9 16h4" />
        <rect x="4" y="4" width="16" height="16" rx="2" />
      </svg>
    ),
  },
  {
    n: "02",
    title: "See your top three matches",
    body: "We surface the planners best suited to you. Compare portfolios, pricing, and reviews side-by-side.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m12 15 4 4 8-9" />
        <path d="M3 12 7 16l1-1" />
      </svg>
    ),
  },
  {
    n: "03",
    title: "Message and book",
    body: "Chat with planners, share details, and confirm your booking — all on Eventsee.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-7.6-4L3 21l5.1-1.4A8.5 8.5 0 1 1 21 11.5z" />
      </svg>
    ),
  },
];

/**
 * Get Matched — the central hub where prospective clients begin their planner
 * search.
 *
 * Hero leads with the value proposition + the 7-question quiz CTA, followed
 * by quick event-type chips, a free-text location search, a row of featured
 * planners, the three-step "How it works", and a highlighted free wedding
 * checklist callout.
 */
export default function GetMatchedPage() {
  const featured = FEATURED_IDS
    .map((id) => PLANNERS.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="space-y-14">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/70 bg-white p-6 sm:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-rose-200/50 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl"
        />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
            Get matched
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-900 sm:text-5xl">
            Get matched to your perfect planner in{" "}
            <span className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
              under 2 minutes.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg">
            Answer seven short questions. We&rsquo;ll surface the three
            planners most suited to your style, budget, and timeline — with
            transparent pricing and verified reviews.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/quiz"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-700 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-800"
            >
              Take the 7-question quiz
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/browse"
              className="text-sm font-medium text-zinc-700 underline-offset-4 hover:text-zinc-900 hover:underline"
            >
              Or browse all planners
            </Link>
          </div>

          {/* Event type chips */}
          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Popular event types
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {EVENT_CHIPS.map((c) => (
                <Link
                  key={c.label}
                  href={c.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900"
                >
                  <span className="text-zinc-500">{c.icon}</span>
                  {c.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Location search */}
          <div className="mt-6">
            <LocationSearch />
          </div>
        </div>
      </section>

      {/* FEATURED PLANNERS */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
              Featured this week
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Planners our clients love.
            </h2>
          </div>
          <Link
            href="/browse"
            className="hidden text-sm font-medium text-zinc-700 underline-offset-4 hover:text-zinc-900 hover:underline sm:inline"
          >
            See all planners →
          </Link>
        </div>

        <ul className="grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => (
            <li key={p.id}>
              <PlannerCard planner={p} />
            </li>
          ))}
        </ul>
      </section>

      {/* HOW IT WORKS */}
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 sm:p-10">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
            How it works
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            From idea to booked, in three steps.
          </h2>
        </div>

        <ol className="mt-8 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-rose-100 text-rose-700">
                  {s.icon}
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Step {s.n}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-zinc-900">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FREE WEDDING CHECKLIST CALLOUT */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-rose-500 to-amber-500 p-6 text-white shadow-sm sm:p-10">
        <div className="grid items-center gap-6 sm:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              Free for everyone
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              The Eventsee wedding planning checklist.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
              12 months of planning distilled into one printable, week-by-week
              list. Use it on your own — or hand it to your planner on day
              one.
            </p>
            <Link
              href="/tools/wedding-checklist"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-zinc-50"
            >
              Open the checklist
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="hidden justify-end sm:flex">
            <span className="grid h-28 w-28 place-items-center rounded-3xl bg-white/15 backdrop-blur">
              <svg viewBox="0 0 24 24" className="h-12 w-12 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="5" y="3" width="14" height="18" rx="2" />
                <path d="m9 10 2 2 4-4" />
                <path d="M9 16h6" />
              </svg>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
