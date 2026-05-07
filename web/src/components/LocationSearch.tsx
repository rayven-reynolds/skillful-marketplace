"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const KNOWN_LOCATIONS: Record<string, string> = {
  "san francisco": "san-francisco",
  sf: "san-francisco",
  "san francisco, ca": "san-francisco",
  oakland: "oakland",
  "oakland, ca": "oakland",
  napa: "napa",
  "napa, ca": "napa",
  "los angeles": "los-angeles",
  la: "los-angeles",
  "los angeles, ca": "los-angeles",
  "new york": "new-york",
  nyc: "new-york",
  "new york, ny": "new-york",
};

/**
 * Free-text location search that hands off to the browse filter set.
 *
 * If the entered text matches one of the known city slugs the planner
 * directory recognizes, ``?location=`` is set; otherwise we just navigate to
 * ``/browse`` so the user can pick from the dropdown there.
 */
export function LocationSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const key = value.trim().toLowerCase();
    const slug = KNOWN_LOCATIONS[key];
    router.push(slug ? `/browse?location=${slug}` : "/browse");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-xl items-center gap-2 rounded-full border border-zinc-200 bg-white p-1.5 shadow-sm"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-700">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Where is your event? (e.g. San Francisco)"
        aria-label="Search planners by location"
        className="min-w-0 flex-1 bg-transparent px-1 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        Search
      </button>
    </form>
  );
}
