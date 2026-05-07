"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type EventPrefs = {
  phone?: string | null;
  event_date?: string | null;
  event_type?: string | null;
  guest_count?: string | null;
};

type Me = {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  event_prefs?: EventPrefs | null;
};

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100";

const EVENT_TYPES = [
  "Wedding",
  "Corporate",
  "Birthday",
  "Micro-wedding",
  "Anniversary",
  "Baby Shower",
  "Graduation",
  "Conference",
  "Retreat",
  "Gala",
  "Other",
];

const GUEST_OPTIONS = [
  "Under 50 guests",
  "50–150 guests",
  "150–300 guests",
  "300+ guests",
];

function splitName(name: string | null) {
  if (!name) return { first: "", last: "" };
  const idx = name.indexOf(" ");
  if (idx === -1) return { first: name, last: "" };
  return { first: name.slice(0, idx), last: name.slice(idx + 1) };
}

export default function EditProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // Name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Event prefs
  const [phone, setPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventType, setEventType] = useState("");
  const [guestCount, setGuestCount] = useState("");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Me>("/auth/me")
      .then((u) => {
        setMe(u);
        const { first, last } = splitName(u.display_name);
        setFirstName(first);
        setLastName(last);
        if (u.event_prefs) {
          setPhone(u.event_prefs.phone ?? "");
          setEventDate(u.event_prefs.event_date ?? "");
          setEventType(u.event_prefs.event_type ?? "");
          setGuestCount(u.event_prefs.guest_count ?? "");
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      // Save name
      await apiFetch<Me>("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
        }),
      });
      // Save event prefs
      await apiFetch<Me>("/auth/profile/event", {
        method: "PATCH",
        body: JSON.stringify({
          phone: phone.trim() || null,
          event_date: eventDate || null,
          event_type: eventType || null,
          guest_count: guestCount || null,
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-sm text-zinc-400">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Edit profile</h1>
        <p className="mt-1 text-sm text-zinc-500">{me?.email}</p>
      </div>

      <form className="space-y-8" onSubmit={onSubmit}>

        {/* ── Name ── */}
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-700">Your name</h2>
          <div className="flex gap-3">
            <label className="flex-1 block text-xs font-medium text-zinc-600">
              First name
              <input
                required
                className={inputCls}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                autoComplete="given-name"
              />
            </label>
            <label className="flex-1 block text-xs font-medium text-zinc-600">
              Last name
              <input
                className={inputCls}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                autoComplete="family-name"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-zinc-600">
            Phone number{" "}
            <span className="font-normal text-zinc-400">(optional — only shared with planners you contact)</span>
            <input
              type="tel"
              className={inputCls}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 867-5309"
              autoComplete="tel"
            />
          </label>
        </section>

        {/* ── Event details ── */}
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-zinc-700">Your event</h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              These details auto-fill the contact form when you reach out to planners.
            </p>
          </div>

          <label className="block text-xs font-medium text-zinc-600">
            Type of event
            <select
              className={inputCls}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              <option value="">Select an event type</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-zinc-600">
            Event date
            <input
              type="date"
              className={inputCls}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </label>

          <label className="block text-xs font-medium text-zinc-600">
            Number of guests
            <select
              className={inputCls}
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
            >
              <option value="">Select guest count</option>
              {GUEST_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        </section>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {success && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Profile updated! Your details will auto-fill the next time you contact a planner.
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-full border border-zinc-200 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-full bg-rose-700 py-2.5 text-sm font-medium text-white transition hover:bg-rose-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
