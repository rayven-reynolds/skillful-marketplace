"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Milestone = { id: string; title: string; monthsOut: number; tasks: string[] };

const MILESTONES: Milestone[] = [
  {
    id: "12m",
    title: "12+ months out",
    monthsOut: 12,
    tasks: ["Set a working budget range", "Draft guest list v0", "Book venue shortlist tours"],
  },
  {
    id: "9m",
    title: "9 months out",
    monthsOut: 9,
    tasks: ["Hire planner (if using)", "Book core vendors (photo/video/catering)", "Save-the-date plan"],
  },
  {
    id: "6m",
    title: "6 months out",
    monthsOut: 6,
    tasks: ["Invitations design", "Outfits & fittings timeline", "Hotel room blocks"],
  },
  {
    id: "3m",
    title: "3 months out",
    monthsOut: 3,
    tasks: ["RSVP tracking", "Seating draft", "Final vendor confirmations"],
  },
  {
    id: "1m",
    title: "Final month",
    monthsOut: 1,
    tasks: ["Timeline for day-of", "Payments schedule", "Emergency contacts pack"],
  },
];

const STORAGE_KEY = "eventsee_checklist_v1";

/**
 * Free wedding checklist with local persistence and optional server sync when signed in.
 */
export default function WeddingChecklistPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [monthsOut, setMonthsOut] = useState(9);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const visible = useMemo(() => MILESTONES.filter((m) => m.monthsOut <= monthsOut), [monthsOut]);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      try {
        setChecked(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    (async () => {
      try {
        const res = await apiFetch<{ progress: Record<string, boolean> }>("/me/checklist");
        if (res.progress && Object.keys(res.progress).length) {
          setChecked(res.progress);
        }
      } catch {
        /* anonymous */
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  async function syncCloud() {
    try {
      await apiFetch("/me/checklist", { method: "PUT", body: JSON.stringify({ progress: checked }) });
      setSyncNote("Saved to your account");
    } catch {
      setSyncNote("Log in to sync across devices");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Wedding checklist & timeline</h1>
        <p className="mt-1 text-sm text-zinc-600">
          A lightweight guide organized by how many months out you are. Progress saves in this browser; sign in to sync
          to your profile.
        </p>
      </div>
      <label className="block text-xs font-medium text-zinc-700">
        I am about this many months from the wedding
        <input
          type="range"
          min={1}
          max={12}
          value={monthsOut}
          onChange={(e) => setMonthsOut(Number(e.target.value))}
          className="mt-2 w-full"
        />
        <span className="text-sm text-zinc-800">{monthsOut} months</span>
      </label>
      <div className="space-y-3">
        {visible.map((m) => (
          <section key={m.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">{m.title}</h2>
            <ul className="mt-2 space-y-2 text-sm text-zinc-800">
              {m.tasks.map((t) => {
                const key = `${m.id}:${t}`;
                return (
                  <li key={key} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={!!checked[key]}
                      onChange={(e) => setChecked({ ...checked, [key]: e.target.checked })}
                    />
                    <span>{t}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <button type="button" className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white" onClick={syncCloud}>
        Save progress to account
      </button>
      {syncNote && <p className="text-sm text-zinc-700">{syncNote}</p>}
    </div>
  );
}
