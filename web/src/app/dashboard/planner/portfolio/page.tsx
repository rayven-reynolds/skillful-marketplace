"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Item = { id: string; title: string; event_type: string; photos: string[]; budget_breakdown: Record<string, unknown> };

/**
 * Manage portfolio items and anonymized budget breakdown JSON.
 */
export default function PlannerPortfolioPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState("New feature event");
  const [photo, setPhoto] = useState("https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800");
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const data = await apiFetch<Item[]>(`/planner/portfolio/me`);
    setItems(data);
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function addItem() {
    try {
      await apiFetch(`/planner/portfolio/me`, {
        method: "POST",
        body: JSON.stringify({
          title,
          event_type: "corporate",
          photos: [photo],
          budget_breakdown: { venue_pct_range: [30, 40], av_pct_range: [10, 15] },
        }),
      });
      setTitle("New feature event");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add");
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/planner/portfolio/me/${id}`, { method: "DELETE" });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <Link href="/dashboard/planner" className="text-sm text-rose-800 underline">
          Back
        </Link>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <label className="text-xs font-medium text-zinc-700">
          Title
          <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="mt-2 block text-xs font-medium text-zinc-700">
          Photo URL
          <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={photo} onChange={(e) => setPhoto(e.target.value)} />
        </label>
        <button type="button" className="mt-3 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white" onClick={addItem}>
          Add item
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-zinc-100 bg-white p-3 text-sm shadow-sm">
            <p className="font-semibold">{item.title}</p>
            <p className="text-xs text-zinc-500">{item.event_type}</p>
            <button type="button" className="mt-2 text-xs text-red-700 underline" onClick={() => remove(item.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
