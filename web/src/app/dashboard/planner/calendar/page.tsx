"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Block = { id: string; start_ts: string; end_ts: string; all_day: boolean };

/**
 * Manage manual busy blocks for the planner’s public availability view.
 */
export default function PlannerCalendarPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const data = await apiFetch<Block[]>(`/planner/availability/me`);
    setBlocks(data);
  }

  useEffect(() => {
    reload().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function addBlock() {
    try {
      await apiFetch(`/planner/availability/me`, {
        method: "POST",
        body: JSON.stringify({ start_ts: new Date(start).toISOString(), end_ts: new Date(end).toISOString(), all_day: true }),
      });
      setStart("");
      setEnd("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add block");
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/planner/availability/me/${id}`, { method: "DELETE" });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Availability</h1>
        <Link href="/dashboard/planner" className="text-sm text-rose-800 underline">
          Back
        </Link>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <h2 className="text-sm font-semibold">Add busy range (local → stored as ISO)</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input type="datetime-local" className="rounded-lg border px-3 py-2 text-sm" value={start} onChange={(e) => setStart(e.target.value)} />
          <input type="datetime-local" className="rounded-lg border px-3 py-2 text-sm" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <button type="button" className="mt-3 rounded-full bg-zinc-900 px-4 py-2 text-sm text-white" onClick={addBlock}>
          Save block
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        {blocks.map((b) => (
          <li key={b.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white p-3">
            <span>
              {b.start_ts} → {b.end_ts}
            </span>
            <button type="button" className="text-xs text-red-700 underline" onClick={() => remove(b.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
