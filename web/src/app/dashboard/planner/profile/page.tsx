"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Create or update the authenticated planner’s public profile fields.
 */
export default function PlannerProfileSettingsPage() {
  const [slug, setSlug] = useState("your-handle");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [priceMin, setPriceMin] = useState("3000");
  const [priceMax, setPriceMax] = useState("9000");
  const [styles, setStyles] = useState("full_service,month_of");
  const [sizes, setSizes] = useState("50_150");
  const [specialties, setSpecialties] = useState("lgbtq_inclusive");
  const [vibes, setVibes] = useState("modern_minimal");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiFetch<Record<string, unknown>>("/planner/profile/me");
        if (cancelled || !me) return;
        setSlug(String(me.slug ?? ""));
        setBio(String(me.bio ?? ""));
        setLocation(String(me.location_text ?? ""));
        setPriceMin(String(me.price_min ?? ""));
        setPriceMax(String(me.price_max ?? ""));
        setStyles((me.planning_styles as string[] | undefined)?.join(",") ?? "");
        setSizes((me.event_sizes as string[] | undefined)?.join(",") ?? "");
        setSpecialties((me.specialties as string[] | undefined)?.join(",") ?? "");
        setVibes((me.aesthetic_tags as string[] | undefined)?.join(",") ?? "");
      } catch {
        /* profile may not exist yet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createOrUpdate() {
    const payload = {
      slug,
      bio,
      location_text: location,
      price_min: Number(priceMin),
      price_max: Number(priceMax),
      planning_styles: styles.split(",").map((s) => s.trim()).filter(Boolean),
      event_sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean),
      specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean),
      aesthetic_tags: vibes.split(",").map((s) => s.trim()).filter(Boolean),
      timezone: "UTC",
    };
    try {
      await apiFetch("/planner/profile/me", { method: "PATCH", body: JSON.stringify(payload) });
      setStatus("Profile saved");
    } catch {
      try {
        await apiFetch("/planner/profile", { method: "POST", body: JSON.stringify(payload) });
        setStatus("Profile created");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Unable to save");
      }
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Planner profile</h1>
        <Link href="/dashboard/planner" className="text-sm text-rose-800 underline">
          Back
        </Link>
      </div>
      <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <label className="text-xs font-medium text-zinc-700">
          Slug
          <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-zinc-700">
          Bio
          <textarea className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-zinc-700">
          Location
          <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-zinc-700">
            Price min
            <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-zinc-700">
            Price max
            <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
          </label>
        </div>
        <label className="text-xs font-medium text-zinc-700">
          Planning styles (comma-separated tokens)
          <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={styles} onChange={(e) => setStyles(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-zinc-700">
          Event sizes
          <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={sizes} onChange={(e) => setSizes(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-zinc-700">
          Specialties
          <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={specialties} onChange={(e) => setSpecialties(e.target.value)} />
        </label>
        <label className="text-xs font-medium text-zinc-700">
          Aesthetic tags
          <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={vibes} onChange={(e) => setVibes(e.target.value)} />
        </label>
        <button type="button" className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white" onClick={createOrUpdate}>
          Save profile
        </button>
        {status && <p className="text-sm text-zinc-700">{status}</p>}
      </div>
    </div>
  );
}
