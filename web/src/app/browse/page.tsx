"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
};

/**
 * Planner discovery page with mobile-first filter controls.
 */
export default function BrowsePage() {
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (location.trim()) p.set("location", location.trim());
    if (priceMax.trim()) p.set("price_max", priceMax.trim());
    if (eventDate) p.set("event_date", eventDate);
    if (availableOnly) p.set("available_only", "true");
    const qs = p.toString();
    return qs ? `?${qs}` : "";
  }, [location, priceMax, eventDate, availableOnly]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<Planner[]>(`/public/planners${query}`);
        if (!cancelled) setPlanners(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load planners");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Find planners</h1>
        <p className="mt-1 text-sm text-zinc-600">Filter by location, budget ceiling, and availability on your date.</p>
      </div>
      <details className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 open:shadow-md sm:open:shadow-sm">
        <summary className="cursor-pointer text-sm font-medium text-zinc-900">Filters</summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-zinc-700">
            Location contains
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="San Francisco"
            />
          </label>
          <label className="text-xs font-medium text-zinc-700">
            Max budget (USD)
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="12000"
              inputMode="numeric"
            />
          </label>
          <label className="text-xs font-medium text-zinc-700">
            Event date
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm text-zinc-800 sm:mt-8">
            <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
            Only show planners free that day (UTC day window)
          </label>
        </div>
      </details>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-3">
        {planners.map((p) => (
          <li key={p.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link href={`/planners/${p.slug}`} className="text-base font-semibold text-zinc-900 hover:underline">
                  {p.slug.replace(/-/g, " ")}
                </Link>
                <p className="text-xs text-zinc-500">{p.location_text}</p>
              </div>
              {p.is_premium && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                  Premium
                </span>
              )}
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-zinc-600">{p.bio}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-700">
              <span>
                Budget: ${p.price_min.toLocaleString()} – ${p.price_max.toLocaleString()}
              </span>
              {p.response_time_hours != null && <span>Typical reply: ~{p.response_time_hours.toFixed(1)}h</span>}
              <span>
                Reviews: {p.review_count}
                {p.avg_rating != null ? ` · ★ ${p.avg_rating.toFixed(1)}` : ""}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
