"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type Me = { id: string; email: string; display_name: string | null; role: string } | null;

/* ── tiny helpers ───────────────────────────────────────────── */
function NavLink({ href, label, matchFn }: { href: string; label: string; matchFn?: (p: string) => boolean }) {
  const pathname = usePathname();
  const active = matchFn ? matchFn(pathname) : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={[
        "text-sm font-semibold transition-colors",
        active ? "text-sage-dark" : "text-sage-dark/70 hover:text-sage-dark",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function MenuItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="block px-4 py-2.5 text-sm text-dark-text transition hover:bg-sage-tint hover:text-sage-dark"
    >
      {children}
    </Link>
  );
}

function MenuDivider() {
  return <div role="separator" className="mx-3 my-1 h-px bg-sage-border/60" />;
}

/* ── main component ─────────────────────────────────────────── */
export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me>(null);
  const [responseCount, setResponseCount] = useState(0);
  const [newInquiryCount, setNewInquiryCount] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    apiFetch<NonNullable<Me>>("/auth/me").then(setMe).catch(() => setMe(null));
  }, [pathname]);

  // Fetch unread planner responses for client accounts
  useEffect(() => {
    if (!me || me.role === "planner") { setResponseCount(0); return; }
    if (pathname === "/wishlist") { setResponseCount(0); return; }
    apiFetch<Array<{ has_planner_reply: boolean }>>("/inquiries/mine")
      .then((rows) => setResponseCount(rows.filter((r) => r.has_planner_reply).length))
      .catch(() => setResponseCount(0));
  }, [me, pathname]);

  // Fetch open inquiry count for planner accounts — powers the badge on "Manage My Business"
  // The badge reflects open inquiries the planner hasn't opened yet (tracked in localStorage).
  function computePlannerBadge(rows: Array<{ id: string; status: string }>) {
    try {
      const seen = new Set<string>(JSON.parse(localStorage.getItem("eventsee_seen_inq") ?? "[]"));
      return rows.filter((r) => r.status === "open" && !seen.has(r.id)).length;
    } catch {
      return rows.filter((r) => r.status === "open").length;
    }
  }

  useEffect(() => {
    if (!me || me.role !== "planner") { setNewInquiryCount(0); return; }
    let latest: Array<{ id: string; status: string }> = [];
    apiFetch<Array<{ id: string; status: string }>>("/inquiries/inbox/planner")
      .then((rows) => { latest = rows; setNewInquiryCount(computePlannerBadge(rows)); })
      .catch(() => setNewInquiryCount(0));

    // Recompute whenever a card is marked seen (localStorage update)
    function onStorage(e: StorageEvent) {
      if (e.key === "eventsee_seen_inq") setNewInquiryCount(computePlannerBadge(latest));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [me, pathname]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => { setOpen(false); setDeleteConfirm(false); }, [pathname]);

  async function handleLogout() {
    setOpen(false);
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    setMe(null);
    router.push("/");
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await apiFetch("/auth/me", { method: "DELETE" });
      setMe(null);
      setOpen(false);
      router.push("/");
    } catch {
      setDeleting(false);
    }
  }

  return (
    <header
      className="sticky top-0 z-[100] flex h-[68px] items-center border-b"
      style={{
        background: "rgba(245,248,245,0.97)",
        backdropFilter: "blur(12px)",
        borderColor: "#DDE8DF",
      }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6">

        {/* ── Wordmark ── */}
        <Link href="/" className="shrink-0 font-display text-[22px] font-extrabold leading-none tracking-tight text-dark-text">
          Eventsee
        </Link>

        {/* ── Right side: nav links + divider + actions ── */}
        <div className="flex items-center gap-4">

          {/* Nav links — always visible */}
          <nav className="flex items-center" aria-label="Primary">
            <NavLink href="/browse" label="Search" />
            <span className="mx-5 h-4 w-px bg-sage-border" aria-hidden />
            {/* Wishlist with response badge */}
            <div className="relative">
              <NavLink href="/wishlist" label="Wishlist" />
              {responseCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                  {responseCount > 9 ? "9+" : responseCount}
                </span>
              )}
            </div>
          </nav>

          {/* Divider between nav links and action buttons */}
          <span className="h-5 w-px" style={{ background: "#DDE8DF" }} aria-hidden />

          {/* List Your Business / Manage My Business */}
          {me?.role === "planner" ? (
            <div className="relative">
              <Link
                href="/my-business"
                className="flex items-center rounded-full border px-[18px] py-[9px] text-sm font-semibold transition hover:bg-sage-tint"
                style={{ borderColor: "#C8D8CB", color: "#3D5C4A", borderWidth: "1.5px" }}
              >
                Manage My Business
              </Link>
              {newInquiryCount > 0 && (
                <span className="absolute -right-1 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                  {newInquiryCount > 9 ? "9+" : newInquiryCount}
                </span>
              )}
            </div>
          ) : (
            <Link
              href="/become-a-planner"
              className="flex items-center rounded-full border px-[18px] py-[9px] text-sm font-semibold transition hover:bg-sage-tint"
              style={{ borderColor: "#C8D8CB", color: "#3D5C4A", borderWidth: "1.5px" }}
            >
              List Your Business
            </Link>
          )}

          {/* Account button + dropdown */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((s) => !s)}
              className="flex items-center gap-1.5 rounded-full border bg-white px-3 py-2 transition hover:shadow-md"
              style={{ borderColor: "#C8D8CB", borderWidth: "1.5px" }}
            >
              {/* Person icon */}
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#3D5C4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
              {/* Chevron */}
              <svg
                viewBox="0 0 24 24"
                className={["h-3 w-3 transition-transform", open ? "rotate-180" : ""].join(" ")}
                fill="none" stroke="#3D5C4A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {open && (
              <div
                role="menu"
                aria-label="Account"
                className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border bg-white shadow-lg"
                style={{ borderColor: "#C8D8CB" }}
              >
                {me ? (
                  <>
                    {/* Identity */}
                    <div className="px-4 py-3">
                      <p className="truncate text-sm font-semibold text-dark-text">
                        {me.display_name ?? me.email}
                      </p>
                      <p className="truncate text-xs text-muted-text">{me.email}</p>
                      <span
                        className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ background: "#EDF4EF", color: "#3D5C4A" }}
                      >
                        {me.role === "planner" ? "Planner" : "Client"}
                      </span>
                    </div>
                    <MenuDivider />
                    <MenuItem href="/profile/edit">Edit Profile</MenuItem>
                    {me.role !== "planner" && (
                      <MenuItem href="/become-a-planner">Become a Planner</MenuItem>
                    )}
                    <MenuDivider />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Log out
                    </button>
                    <MenuDivider />
                    {!deleteConfirm ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => setDeleteConfirm(true)}
                        className="w-full px-4 py-2.5 text-left text-xs text-zinc-400 transition hover:bg-zinc-50 hover:text-red-500"
                      >
                        Delete my account
                      </button>
                    ) : (
                      <div className="px-4 py-3">
                        <p className="mb-2 text-xs font-medium text-red-600">
                          This is permanent and cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={deleting}
                            onClick={handleDeleteAccount}
                            className="flex-1 rounded-full bg-red-600 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            {deleting ? "Deleting…" : "Confirm delete"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(false)}
                            className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <MenuItem href="/login">Sign In</MenuItem>
                    <MenuItem href="/register">Sign Up</MenuItem>
                    <MenuDivider />
                    <MenuItem href="/browse?segment=personal">Wedding &amp; personal planners</MenuItem>
                    <MenuItem href="/browse?segment=corporate">Corporate planners</MenuItem>
                    <MenuItem href="/tools/wedding-checklist">Wedding planning checklist</MenuItem>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
