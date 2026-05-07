"use client";

/**
 * Root-level error boundary (wraps the entire document when the root layout fails).
 *
 * Must define ``html`` and ``body`` because it replaces the root layout on failure.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center bg-zinc-100 px-4 font-sans text-zinc-900">
        <div className="max-w-md rounded-lg border border-red-200 bg-white px-6 py-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-red-900">Application error</h1>
          <p className="mt-2 text-sm text-zinc-700">{error.message}</p>
          <button
            type="button"
            className="mt-6 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
