import Link from "next/link";

/**
 * Primary mobile-first navigation for Eventsee marketing and tools.
 *
 * @returns Top navigation bar element.
 */
export function AppNav() {
  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-900">
          Eventsee
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-3 text-sm text-zinc-700">
          <Link href="/browse" className="hover:text-zinc-900">
            Browse
          </Link>
          <Link href="/quiz" className="hover:text-zinc-900">
            Fit quiz
          </Link>
          <Link href="/tools/wedding-checklist" className="hover:text-zinc-900">
            Checklist
          </Link>
          <Link href="/login" className="hover:text-zinc-900">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800"
          >
            Sign up
          </Link>
        </nav>
      </div>
    </header>
  );
}
