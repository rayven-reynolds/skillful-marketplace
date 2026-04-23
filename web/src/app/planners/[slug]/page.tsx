"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Planner = {
  id: string;
  slug: string;
  bio: string;
  location_text: string;
  price_min: number;
  price_max: number;
  response_time_hours: number | null;
  is_premium: boolean;
  avg_rating: number | null;
  review_count: number;
  timezone: string;
};

type Portfolio = { id: string; title: string; event_type: string; photos: string[]; budget_breakdown: Record<string, unknown> };
type Review = { id: string; rating: number; body: string; created_at: string; verified: boolean };
type Block = { id: string; start_ts: string; end_ts: string; all_day: boolean };

/**
 * Public planner profile with portfolio, reviews, availability, and intake CTAs.
 */
export default function PlannerProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [planner, setPlanner] = useState<Planner | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<"individual" | "corporate">("individual");
  const [message, setMessage] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [eventKind, setEventKind] = useState("");
  const [corpEventType, setCorpEventType] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, po, r, b] = await Promise.all([
          apiFetch<Planner>(`/public/planners/by-slug/${slug}`),
          apiFetch<Portfolio[]>(`/public/planners/by-slug/${slug}/portfolio`),
          apiFetch<Review[]>(`/public/planners/by-slug/${slug}/reviews`),
          apiFetch<Block[]>(`/public/planners/by-slug/${slug}/availability`),
        ]);
        if (!cancelled) {
          setPlanner(p);
          setPortfolio(po);
          setReviews(r);
          setBlocks(b);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load planner");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function saveFavorite() {
    if (!planner) return;
    try {
      await apiFetch(`/favorites/${planner.id}`, { method: "POST" });
      setStatus("Saved to favorites");
    } catch {
      setStatus("Sign in required to save favorites");
    }
  }

  async function sendInquiry() {
    if (!planner) return;
    const intake =
      segment === "corporate"
        ? { company_name: companyName, event_type: corpEventType }
        : { event_kind: eventKind || "wedding" };
    try {
      await apiFetch(`/inquiries`, {
        method: "POST",
        body: JSON.stringify({
          planner_profile_id: planner.id,
          client_segment: segment,
          event_date: eventDate || null,
          message,
          intake_payload: intake,
        }),
      });
      setStatus("Inquiry sent");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not send inquiry");
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!planner) return <p className="text-sm text-zinc-600">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-rose-700">Planner</p>
            <h1 className="text-2xl font-semibold capitalize">{planner.slug.replaceAll("-", " ")}</h1>
            <p className="text-sm text-zinc-600">{planner.location_text}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {planner.is_premium && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">Premium</span>
            )}
            <button
              type="button"
              onClick={saveFavorite}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-900"
            >
              Save planner
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-700">{planner.bio}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-800">
          <span>
            Budget: ${planner.price_min.toLocaleString()} – ${planner.price_max.toLocaleString()}
          </span>
          {planner.response_time_hours != null && <span>Typical reply ~{planner.response_time_hours.toFixed(1)}h</span>}
          <span>
            Reviews: {planner.review_count}
            {planner.avg_rating != null ? ` · ★ ${planner.avg_rating.toFixed(1)}` : ""}
          </span>
          <span>Timezone: {planner.timezone}</span>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
        <h2 className="text-lg font-semibold">Portfolio</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {portfolio.map((item) => (
            <article key={item.id} className="space-y-2 rounded-xl border border-zinc-100 p-3">
              {item.photos[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photos[0]} alt={item.title} className="h-40 w-full rounded-lg object-cover" />
              )}
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="text-xs text-zinc-500">{item.event_type}</p>
              <div className="text-xs text-zinc-700">
                <p className="font-medium">Anonymized budget shape</p>
                <pre className="mt-1 overflow-x-auto rounded bg-zinc-50 p-2 text-[11px]">
                  {JSON.stringify(item.budget_breakdown, null, 2)}
                </pre>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
        <h2 className="text-lg font-semibold">Live busy dates (UTC blocks)</h2>
        <ul className="mt-2 space-y-2 text-sm text-zinc-700">
          {blocks.length === 0 && <li>No busy blocks published.</li>}
          {blocks.map((b) => (
            <li key={b.id}>
              {new Date(b.start_ts).toLocaleDateString()} → {new Date(b.end_ts).toLocaleDateString()}
              {b.all_day ? " · all day" : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
        <h2 className="text-lg font-semibold">Verified reviews</h2>
        <ul className="mt-3 space-y-3">
          {reviews.length === 0 && <li className="text-sm text-zinc-600">No reviews yet.</li>}
          {reviews.map((rev) => (
            <li key={rev.id} className="rounded-lg border border-zinc-100 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">★ {rev.rating}</span>
                <span className="text-xs text-emerald-700">{rev.verified ? "Verified booking" : ""}</span>
              </div>
              <p className="mt-2 text-zinc-700">{rev.body}</p>
              <p className="mt-1 text-xs text-zinc-500">{new Date(rev.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
        <h2 className="text-lg font-semibold">Send an inquiry</h2>
        <p className="text-sm text-zinc-600">
          Choose the intake path that matches your event. You must be signed in to send inquiries in production; this
          MVP assumes you have registered a client account.
        </p>
        <div className="mt-3 flex gap-2 text-sm">
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${segment === "individual" ? "bg-zinc-900 text-white" : "border border-zinc-300"}`}
            onClick={() => setSegment("individual")}
          >
            Wedding / personal
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${segment === "corporate" ? "bg-zinc-900 text-white" : "border border-zinc-300"}`}
            onClick={() => setSegment("corporate")}
          >
            Corporate / team / client dinner
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-zinc-700">
            Event date
            <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </label>
          {segment === "individual" ? (
            <label className="text-xs font-medium text-zinc-700">
              Event kind
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={eventKind}
                onChange={(e) => setEventKind(e.target.value)}
                placeholder="wedding, birthday, etc."
              />
            </label>
          ) : (
            <>
              <label className="text-xs font-medium text-zinc-700">
                Company name
                <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </label>
              <label className="text-xs font-medium text-zinc-700">
                Corporate event type
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={corpEventType}
                  onChange={(e) => setCorpEventType(e.target.value)}
                  placeholder="offsite, client dinner, summit"
                />
              </label>
            </>
          )}
        </div>
        <label className="mt-3 block text-xs font-medium text-zinc-700">
          Message
          <textarea className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" className="rounded-full bg-rose-700 px-4 py-2 text-sm text-white" onClick={sendInquiry}>
            Send inquiry
          </button>
          <Link href="/register" className="text-sm text-rose-800 underline">
            Create account
          </Link>
        </div>
        {status && <p className="mt-2 text-sm text-zinc-700">{status}</p>}
      </section>
    </div>
  );
}
