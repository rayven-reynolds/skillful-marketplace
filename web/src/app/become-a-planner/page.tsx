"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type Me = { id: string; role: string } | null;

const SPECIALTIES = [
  { value: "wedding",      label: "Wedding" },
  { value: "corporate",    label: "Corporate" },
  { value: "birthday",     label: "Birthday" },
  { value: "micro_wedding",label: "Micro-wedding" },
  { value: "anniversary",  label: "Anniversary" },
  { value: "baby_shower",  label: "Baby Shower" },
  { value: "graduation",   label: "Graduation" },
  { value: "conference",   label: "Conference" },
  { value: "retreat",      label: "Retreat" },
  { value: "gala",         label: "Gala" },
  { value: "other",        label: "Other" },
];

const PLANNING_STYLES = [
  { value: "full_service", label: "Full service" },
  { value: "month_of",     label: "Month-of coordination" },
  { value: "partial",      label: "Partial planning" },
  { value: "day_of",       label: "Day-of coordination" },
  { value: "venue_only",   label: "Venue search only" },
];

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-sage-mid focus:ring-2 focus:ring-sage-tint";

function ToggleChip({ label, selected, onClick, disabled }: { label: string; selected: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !selected}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        selected ? "border-sage-dark bg-sage-tint text-sage-dark" : "border-zinc-200 text-zinc-600 hover:border-zinc-400",
        disabled && !selected ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

const MAX_SPECIALTIES = 3;

export default function BecomeAPlannerPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | "loading">("loading");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [businessName, setBusinessName]   = useState("");
  const [location, setLocation]           = useState("");
  const [bio, setBio]                     = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [instagram, setInstagram]         = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles]             = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [hasAvailability, setHasAvailability] = useState(false);

  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<NonNullable<Me>>("/auth/me").then(setMe).catch(() => setMe(null));
  }, []);

  function toggleSpecialty(val: string) {
    setSelectedSpecialties((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );
  }

  function toggleStyle(val: string) {
    setSelectedStyles((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const next = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setPhotos((prev) => [...prev, ...next].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!businessName.trim()) { setError("Business name is required."); return; }
    if (!location.trim()) { setError("Location is required."); return; }
    if (!bio.trim()) { setError("About your business is required."); return; }
    if (!startingPrice || parseInt(startingPrice) <= 0) { setError("Starting price is required."); return; }
    if (selectedSpecialties.length === 0) { setError("Select at least one event specialty."); return; }
    if (photos.length < 3) { setError("Please upload at least 3 portfolio photos."); return; }
    if (!hasAvailability) { setError("Please confirm your availability by checking the box below."); return; }

    setLoading(true);
    try {
      // Upload photos first
      const photoUrls: string[] = [];
      for (const p of photos) {
        const fd = new FormData();
        fd.append("file", p.file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) {
          const { url } = await res.json() as { url: string };
          photoUrls.push(url);
        }
      }

      await apiFetch("/auth/become-planner", {
        method: "POST",
        body: JSON.stringify({
          business_name:  businessName.trim(),
          location_text:  location.trim(),
          bio,
          price_min:      parseInt(startingPrice, 10),
          price_max:      parseInt(startingPrice, 10),
          specialties:    selectedSpecialties,
          planning_styles: selectedStyles,
          event_sizes:    [],
          aesthetic_tags: [],
          instagram_url:  instagram.trim() || null,
          cover_photos:   photoUrls,
        }),
      });
      router.push("/my-business");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (me === "loading") return null;

  if (!me) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold text-dark-text">Sign in first</h1>
        <p className="mt-2 text-sm text-muted-text">You need an account to create a planner profile.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/register" className="rounded-full bg-sage-dark px-5 py-2.5 text-sm font-medium text-white hover:bg-sage-mid">Create account</Link>
          <Link href="/login" className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-900">Log in</Link>
        </div>
      </div>
    );
  }

  if (me.role === "planner") {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold text-dark-text">You already have a profile</h1>
        <p className="mt-2 text-sm text-muted-text">Manage your business from the My Business page.</p>
        <Link href="/my-business" className="mt-6 inline-block rounded-full bg-sage-dark px-5 py-2.5 text-sm font-medium text-white hover:bg-sage-mid">Go to My Business</Link>
      </div>
    );
  }

  const atSpecialtyLimit = selectedSpecialties.length >= MAX_SPECIALTIES;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-text">Become a Planner</h1>
        <p className="mt-1 text-sm text-muted-text">Tell clients about your business — you can edit everything later.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

        {/* Business name */}
        <label className="block text-xs font-semibold text-zinc-700">
          Business name <span className="text-red-500">*</span>
          <input required className={inputCls} placeholder="Studio Bloom Events" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          <span className="mt-0.5 block text-xs font-normal text-zinc-400">This becomes your public profile URL.</span>
        </label>

        {/* Location */}
        <label className="block text-xs font-semibold text-zinc-700">
          Primary location <span className="text-red-500">*</span>
          <input required className={inputCls} placeholder="Austin, TX" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>

        {/* About */}
        <label className="block text-xs font-semibold text-zinc-700">
          About your business <span className="text-red-500">*</span>
          <textarea required rows={3} className={inputCls} placeholder="Tell clients what makes your planning style unique…" value={bio} onChange={(e) => setBio(e.target.value)} />
        </label>

        {/* Starting price */}
        <label className="block text-xs font-semibold text-zinc-700">
          Starting price ($) <span className="text-red-500">*</span>
          <input type="number" required min="1" step="1" className={inputCls} placeholder="3000" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} />
          <span className="mt-0.5 block text-xs font-normal text-zinc-400">The minimum price for your services.</span>
        </label>

        {/* Instagram */}
        <label className="block text-xs font-semibold text-zinc-700">
          Instagram handle
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 focus-within:border-sage-mid focus-within:ring-2 focus-within:ring-sage-tint">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
            </svg>
            <input
              type="text"
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
              placeholder="@yourbusiness"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </div>
        </label>

        {/* Event specialties */}
        <div>
          <p className="text-xs font-semibold text-zinc-700">
            Event specialties <span className="text-red-500">*</span>
            <span className="ml-1 font-normal text-zinc-400">(choose up to {MAX_SPECIALTIES})</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => (
              <ToggleChip
                key={s.value}
                label={s.label}
                selected={selectedSpecialties.includes(s.value)}
                onClick={() => toggleSpecialty(s.value)}
                disabled={atSpecialtyLimit}
              />
            ))}
          </div>
          {atSpecialtyLimit && (
            <p className="mt-1.5 text-[11px] text-sage-mid">Max {MAX_SPECIALTIES} specialties selected.</p>
          )}
        </div>

        {/* Planning styles */}
        <div>
          <p className="text-xs font-semibold text-zinc-700">Planning styles offered</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PLANNING_STYLES.map((s) => (
              <ToggleChip key={s.value} label={s.label} selected={selectedStyles.includes(s.value)} onClick={() => toggleStyle(s.value)} />
            ))}
          </div>
        </div>

        {/* Photos — min 3 required */}
        <div>
          <p className="text-xs font-semibold text-zinc-700">
            Portfolio photos <span className="text-red-500">*</span>
            <span className="ml-1 font-normal text-zinc-400">(minimum 3 required, up to 10)</span>
          </p>

          {photos.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((p, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="sr-only" id="bap-photos" onChange={onFileChange} />
          <label
            htmlFor="bap-photos"
            className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500 transition hover:border-sage-light hover:text-sage-dark"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {photos.length === 0 ? "Upload at least 3 photos" : `${photos.length} photo${photos.length !== 1 ? "s" : ""} added — click to add more`}
          </label>
          {photos.length > 0 && photos.length < 3 && (
            <p className="mt-1 text-[11px] text-amber-600">{3 - photos.length} more photo{3 - photos.length !== 1 ? "s" : ""} required.</p>
          )}
          {photos.length >= 3 && (
            <p className="mt-1 text-[11px] text-emerald-600">✓ Minimum photo requirement met.</p>
          )}
        </div>

        {/* Availability confirmation */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold text-zinc-700">Availability <span className="text-red-500">*</span></p>
          <p className="mt-1 text-xs text-zinc-500">
            After creating your profile you&apos;ll be able to mark specific dates as unavailable in your My Business dashboard.
            For now, confirm that you&apos;re generally available to take bookings.
          </p>
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={hasAvailability}
              onChange={(e) => setHasAvailability(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-sage-dark"
            />
            I am currently available to take new clients
          </label>
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-sage-dark py-3 text-sm font-semibold text-white transition hover:bg-sage-mid disabled:opacity-50"
        >
          {loading ? "Creating your profile…" : "Create my planner profile"}
        </button>
      </form>
    </div>
  );
}
