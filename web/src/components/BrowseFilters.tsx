"use client";

/**
 * Canonical search/filter bar used on both the homepage (SearchStrip) and
 * the browse page (/browse). Reads URL params on mount to pre-populate state
 * (relevant on /browse), then on "Search" pushes updated params to /browse.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/* ─── static option lists ─────────────────────────────────────── */
export const EVENT_TYPES = [
  { value: "wedding",       label: "Wedding" },
  { value: "corporate",     label: "Corporate" },
  { value: "birthday",      label: "Birthday" },
  { value: "micro_wedding", label: "Micro-wedding" },
  { value: "anniversary",   label: "Anniversary" },
  { value: "baby_shower",   label: "Baby Shower" },
  { value: "graduation",    label: "Graduation" },
  { value: "conference",    label: "Conference" },
  { value: "retreat",       label: "Retreat" },
  { value: "gala",          label: "Gala" },
  { value: "other",         label: "Other" },
];

export const PLANNING_STYLES = [
  { value: "full_service",     label: "Full service" },
  { value: "month_of",         label: "Month-of coordination" },
  { value: "partial_planning", label: "Partial planning" },
  { value: "day_of",           label: "Day-of coordination" },
  { value: "venue_only",       label: "Venue search only" },
];

export const BUDGET_OPTIONS = [
  { value: "budget",  label: "$0 – $1,000" },
  { value: "mid",     label: "$1,000 – $5,000" },
  { value: "premium", label: "$5,000 – $10,000" },
  { value: "luxury",  label: "$10,000+" },
];

export const GUEST_OPTIONS = [
  { value: "small",  label: "Under 50 guests" },
  { value: "medium", label: "50 – 150 guests" },
  { value: "large",  label: "150 – 300 guests" },
  { value: "xlarge", label: "300+ guests" },
];

/* ─── US major cities list (City, ST) ────────────────────────── */
const US_CITIES = [
  "Albuquerque, NM","Anaheim, CA","Anchorage, AK","Ann Arbor, MI","Arlington, TX","Arlington, VA",
  "Atlanta, GA","Augusta, GA","Aurora, CO","Aurora, IL","Austin, TX","Bakersfield, CA",
  "Baltimore, MD","Baton Rouge, LA","Bellevue, WA","Berkeley, CA","Birmingham, AL","Boise, ID",
  "Boston, MA","Boulder, CO","Bridgeport, CT","Buffalo, NY","Burlington, VT","Cambridge, MA",
  "Cape Coral, FL","Chandler, AZ","Charleston, SC","Charleston, WV","Charlotte, NC","Chattanooga, TN",
  "Chicago, IL","Chula Vista, CA","Cincinnati, OH","Clearwater, FL","Cleveland, OH","Colorado Springs, CO",
  "Columbia, MO","Columbia, SC","Columbus, GA","Columbus, OH","Concord, CA","Concord, NC",
  "Coral Springs, FL","Corona, CA","Corpus Christi, TX","Dallas, TX","Dayton, OH","Denver, CO",
  "Des Moines, IA","Detroit, MI","Durham, NC","El Paso, TX","Elk Grove, CA","Escondido, CA",
  "Eugene, OR","Evansville, IN","Fargo, ND","Fayetteville, NC","Fontana, CA","Fort Collins, CO",
  "Fort Lauderdale, FL","Fort Wayne, IN","Fort Worth, TX","Fremont, CA","Frisco, TX","Fresno, CA",
  "Gainesville, FL","Garden Grove, CA","Garland, TX","Gilbert, AZ","Glendale, AZ","Glendale, CA",
  "Grand Rapids, MI","Greensboro, NC","Hartford, CT","Henderson, NV","Hialeah, FL","Hillsboro, OR",
  "Hollywood, FL","Honolulu, HI","Houston, TX","Huntington Beach, CA","Huntsville, AL","Indianapolis, IN",
  "Irvine, CA","Irving, TX","Jacksonville, FL","Jersey City, NJ","Joliet, IL","Kansas City, KS",
  "Kansas City, MO","Kent, WA","Killeen, TX","Knoxville, TN","Lakewood, CO","Lancaster, CA",
  "Lansing, MI","Laredo, TX","Las Vegas, NV","Lexington, KY","Lincoln, NE","Little Rock, AR",
  "Long Beach, CA","Los Angeles, CA","Louisville, KY","Lubbock, TX","Macon, GA","Madison, WI",
  "McKinney, TX","Memphis, TN","Mesa, AZ","Miami, FL","Milwaukee, WI","Minneapolis, MN",
  "Miramar, FL","Modesto, CA","Moreno Valley, CA","Nashville, TN","Napa, CA","Naperville, IL",
  "New Haven, CT","New Orleans, LA","New York, NY","Newark, NJ","Norfolk, VA","North Las Vegas, NV",
  "Oakland, CA","Oceanside, CA","Oklahoma City, OK","Omaha, NE","Ontario, CA","Orange, CA",
  "Orlando, FL","Overland Park, KS","Oxnard, CA","Palm Springs, CA","Palmdale, CA","Pasadena, CA",
  "Pasadena, TX","Paterson, NJ","Pembroke Pines, FL","Peoria, AZ","Philadelphia, PA","Phoenix, AZ",
  "Pittsburgh, PA","Plano, TX","Pomona, CA","Portland, ME","Portland, OR","Providence, RI",
  "Raleigh, NC","Rancho Cucamonga, CA","Reno, NV","Renton, WA","Richmond, VA","Riverside, CA",
  "Rochester, MN","Rochester, NY","Rockford, IL","Sacramento, CA","Salem, OR","Salinas, CA",
  "Salt Lake City, UT","San Antonio, TX","San Bernardino, CA","San Diego, CA","San Francisco, CA",
  "San Jose, CA","San Luis Obispo, CA","Santa Ana, CA","Santa Barbara, CA","Santa Clara, CA",
  "Santa Cruz, CA","Santa Rosa, CA","Savannah, GA","Scottsdale, AZ","Seattle, WA","Shreveport, LA",
  "Sioux Falls, SD","South Bend, IN","Spokane, WA","Stamford, CT","St. Louis, MO","St. Paul, MN",
  "St. Petersburg, FL","Stockton, CA","Surprise, AZ","Syracuse, NY","Tacoma, WA","Tallahassee, FL",
  "Tampa, FL","Tempe, AZ","Toledo, OH","Torrance, CA","Tucson, AZ","Tulsa, OK","Vancouver, WA",
  "Virginia Beach, VA","Washington, DC","West Palm Beach, FL","Winston-Salem, NC","Worcester, MA",
  "Yonkers, NY","Bozeman, MT","Billings, MT","Missoula, MT","Cheyenne, WY","Casper, WY",
  "Provo, UT","Ogden, UT","St. George, UT","Bend, OR","Medford, OR","Beaverton, OR",
  "Redmond, WA","Kirkland, WA","Everett, WA","Bellevue, WA","Meridian, ID","Nampa, ID",
  "Fairbanks, AK","Juneau, AK","Hilo, HI","Kailua, HI","Wailuku, HI","Monterey, CA",
  "Ventura, CA","Thousand Oaks, CA","Simi Valley, CA","Vallejo, CA","Burbank, CA","Inglewood, CA",
  "Costa Mesa, CA","Murrieta, CA","Fullerton, CA","Visalia, CA","Roseville, CA","Concord, CA",
  "Victorville, CA","El Monte, CA","Downey, CA","West Covina, CA","Norwalk, CA",
];

/* ─── helpers ─────────────────────────────────────────────────── */
function multiLabel(selected: string[], options: { value: string; label: string }[], singular: string) {
  if (selected.length === 0) return singular;
  if (selected.length === 1) return options.find((o) => o.value === selected[0])?.label ?? singular;
  return `${selected.length} selected`;
}

/* ─── Multi-select checkbox dropdown ─────────────────────────── */
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  borderRight = true,
  roundedLeft = false,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  borderRight?: boolean;
  roundedLeft?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function toggle(val: string) {
    if (selected.includes(val)) onChange(selected.filter((v) => v !== val));
    else onChange([...selected, val]);
  }

  const display = multiLabel(selected, options, label);
  const active = selected.length > 0;

  return (
    <div
      ref={ref}
      className={`relative flex flex-1 flex-col justify-center px-4 py-3 ${borderRight ? "border-r" : ""} ${roundedLeft ? "rounded-l-2xl" : ""}`}
      style={{ borderColor: "#C8D8CB", background: "#fff" }}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#3D5C4A" }}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="relative mt-0.5 flex items-center pr-5 text-left"
      >
        <span
          className={`text-[13px] ${active ? "font-medium" : ""}`}
          style={{ color: active ? "#1A261D" : "#9A9A9A" }}
        >
          {display}
        </span>
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400"
          fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points={open ? "6 15 12 9 18 15" : "6 9 12 15 18 9"} />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border bg-white shadow-xl"
          style={{ borderColor: "#C8D8CB" }}
        >
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-[#F5F8F5]"
            >
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer rounded"
                style={{ accentColor: "#3D5C4A" }}
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
              />
              <span style={{ color: selected.includes(o.value) ? "#1A261D" : "#4A4A4A" }}>
                {o.label}
              </span>
            </label>
          ))}
          {selected.length > 0 && (
            <div className="border-t px-4 py-2" style={{ borderColor: "#E2EDE4" }}>
              <button
                type="button"
                onClick={() => { onChange([]); setOpen(false); }}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Single-select checkbox dropdown (same visual as MultiSelect) ── */
function SingleSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  borderRight = true,
}: {
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  borderRight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const active = Boolean(value);
  const display = active ? (options.find((o) => o.value === value)?.label ?? placeholder) : placeholder;

  function pick(val: string) {
    onChange(val === value ? "" : val); // toggle off if already selected
    setOpen(false);
  }

  return (
    <div
      ref={ref}
      className={`relative flex flex-1 flex-col justify-center px-4 py-3 ${borderRight ? "border-r" : ""}`}
      style={{ borderColor: "#C8D8CB", background: "#fff" }}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#3D5C4A" }}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="relative mt-0.5 flex items-center pr-5 text-left"
      >
        <span
          className={`text-[13px] ${active ? "font-medium" : ""}`}
          style={{ color: active ? "#1A261D" : "#9A9A9A" }}
        >
          {display}
        </span>
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400"
          fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points={open ? "6 15 12 9 18 15" : "6 9 12 15 18 9"} />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[200px] overflow-hidden rounded-xl border bg-white shadow-xl"
          style={{ borderColor: "#C8D8CB" }}
        >
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-[#F5F8F5]"
            >
              <input
                type="radio"
                name={`filter-${label}`}
                className="h-4 w-4 cursor-pointer"
                style={{ accentColor: "#3D5C4A" }}
                checked={value === o.value}
                onChange={() => pick(o.value)}
              />
              <span style={{ color: value === o.value ? "#1A261D" : "#4A4A4A" }}>
                {o.label}
              </span>
            </label>
          ))}
          {active && (
            <div className="border-t px-4 py-2" style={{ borderColor: "#E2EDE4" }}>
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Location free-text with city autocomplete ──────────────── */
function LocationInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) return;
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setShowSugg(false);
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [focused]);

  function handleChange(text: string) {
    onChange(text);
    if (text.trim().length < 2) {
      setSuggestions([]);
      setShowSugg(false);
      return;
    }
    const lower = text.toLowerCase();
    const matches = US_CITIES.filter((city) =>
      city.toLowerCase().includes(lower)
    ).slice(0, 8);
    setSuggestions(matches);
    setShowSugg(matches.length > 0);
  }

  function selectCity(city: string) {
    onChange(city);
    setSuggestions([]);
    setShowSugg(false);
    inputRef.current?.blur();
  }

  return (
    <div
      ref={ref}
      className="relative flex flex-1 flex-col justify-center border-r px-4 py-3"
      style={{ borderColor: "#C8D8CB", background: "#fff" }}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#3D5C4A" }}>
        Location
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder="City, State"
        onFocus={() => setFocused(true)}
        onChange={(e) => handleChange(e.target.value)}
        className="mt-0.5 w-full bg-transparent text-[13px] outline-none"
        style={{ color: value ? "#1A261D" : "#9A9A9A" }}
        autoComplete="off"
        spellCheck={false}
      />

      {showSugg && suggestions.length > 0 && (
        <div
          className="absolute left-0 top-full z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border bg-white shadow-xl"
          style={{ borderColor: "#C8D8CB" }}
        >
          {suggestions.map((city) => (
            <button
              key={city}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectCity(city); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-[#F5F8F5]"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s-8-6.5-8-12a8 8 0 0 1 16 0c0 5.5-8 12-8 12z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ color: "#4A4A4A" }}>{city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main filter bar ─────────────────────────────────────────── */
export function BrowseFilters() {
  const router = useRouter();
  const params = useSearchParams();

  // Initialise state from URL (supports pre-populating on /browse)
  const [eventTypes, setEventTypes] = useState<string[]>(() => {
    const raw = params.get("event_type") ?? params.get("eventType") ?? "";
    return raw ? raw.split(",").filter(Boolean) : [];
  });
  const [services, setServices] = useState<string[]>(() => {
    const raw = params.get("services") ?? "";
    return raw ? raw.split(",").filter(Boolean) : [];
  });
  const [location, setLocation] = useState(params.get("location") ?? "");
  const [budget, setBudget] = useState(params.get("budget") ?? "");
  const [guests, setGuests] = useState(params.get("guests") ?? "");

  function handleSearch() {
    const p = new URLSearchParams();
    if (eventTypes.length > 0) p.set("event_type", eventTypes.join(","));
    if (services.length > 0)   p.set("services", services.join(","));
    if (location.trim())        p.set("location", location.trim());
    if (budget)                 p.set("budget", budget);
    if (guests)                 p.set("guests", guests);
    router.push(`/browse${p.toString() ? `?${p}` : ""}`);
  }

  const hasActive = eventTypes.length > 0 || services.length > 0 || location || budget || guests;

  return (
    <div className="w-full border-b bg-white" style={{ borderColor: "#DDE8DF" }}>
      <div className="mx-auto max-w-7xl px-6 py-4">
        {/* overflow-visible so absolute dropdown panels are not clipped */}
        <div
          className="flex items-stretch rounded-2xl border shadow-sm"
          style={{ borderColor: "#C8D8CB", overflow: "visible" }}
        >
          {/* Event type — multi-select checkboxes */}
          <MultiSelect
            label="Event type"
            options={EVENT_TYPES}
            selected={eventTypes}
            onChange={setEventTypes}
            roundedLeft
          />

          {/* Services — multi-select checkboxes matching planning styles */}
          <MultiSelect
            label="Services"
            options={PLANNING_STYLES}
            selected={services}
            onChange={setServices}
          />

          {/* Location — free text with city autocomplete */}
          <LocationInput value={location} onChange={setLocation} />

          {/* Budget — single select */}
          <SingleSelect
            label="Budget"
            placeholder="Any range"
            options={BUDGET_OPTIONS}
            value={budget}
            onChange={setBudget}
          />

          {/* Guest count — single select */}
          <SingleSelect
            label="Guest count"
            placeholder="Any size"
            options={GUEST_OPTIONS}
            value={guests}
            onChange={setGuests}
            borderRight={false}
          />

          {/* Search button */}
          <button
            type="button"
            onClick={handleSearch}
            className="flex items-center gap-2 px-6 text-sm font-bold text-white transition hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #5C7A65, #3D5C4A)",
              borderRadius: "0 14px 14px 0",
              minWidth: 90,
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            Search
          </button>
        </div>

        {/* Clear all */}
        {hasActive && (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEventTypes([]); setServices([]); setLocation(""); setBudget(""); setGuests("");
                router.push("/browse");
              }}
              className="text-xs text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
