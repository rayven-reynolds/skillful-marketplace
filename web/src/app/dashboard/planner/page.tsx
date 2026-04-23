"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Inquiry = {
  id: string;
  client_user_id: string;
  client_segment: string;
  event_date: string | null;
  message: string;
  status: string;
  created_at: string;
};

type Booking = { id: string; client_user_id: string; status: string; created_at: string };

/**
 * Planner dashboard summarizing inbox inquiries and booking states.
 */
export default function PlannerDashboardPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [i, b] = await Promise.all([
          apiFetch<Inquiry[]>(`/inquiries/inbox/planner`),
          apiFetch<Booking[]>(`/bookings/planner`),
        ]);
        if (!cancelled) {
          setInquiries(i);
          setBookings(b);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Planner dashboard</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded-full border border-zinc-300 px-3 py-1" href="/dashboard/planner/profile">
            Edit profile
          </Link>
          <Link className="rounded-full border border-zinc-300 px-3 py-1" href="/dashboard/planner/calendar">
            Calendar
          </Link>
          <Link className="rounded-full border border-zinc-300 px-3 py-1" href="/dashboard/planner/portfolio">
            Portfolio
          </Link>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <h2 className="text-lg font-semibold">Inquiries</h2>
        <ul className="mt-2 space-y-2 text-sm text-zinc-800">
          {inquiries.length === 0 && <li>No inquiries yet.</li>}
          {inquiries.map((q) => (
            <li key={q.id} className="rounded-lg border border-zinc-100 p-3">
              <p className="text-xs text-zinc-500">{new Date(q.created_at).toLocaleString()}</p>
              <p className="font-medium capitalize">{q.client_segment}</p>
              <p className="text-zinc-700">{q.message}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <h2 className="text-lg font-semibold">Bookings</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {bookings.length === 0 && <li>No bookings yet.</li>}
          {bookings.map((b) => (
            <li key={b.id} className="flex items-center justify-between rounded-lg border border-zinc-100 p-3">
              <div>
                <p className="text-xs text-zinc-500">{new Date(b.created_at).toLocaleString()}</p>
                <p className="font-medium">Client {b.client_user_id.slice(0, 8)}…</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs capitalize">{b.status.replaceAll("_", " ")}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
