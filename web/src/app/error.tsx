"use client";

/**
 * Route-level error boundary for the App Router.
 *
 * Renders when a child segment throws an uncaught exception so the dev overlay
 * can recover instead of stalling on internal "missing error components" states.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center">
      <h2 className="text-lg font-semibold text-red-900">Something went wrong</h2>
      <p className="mt-2 text-sm text-red-800">{error.message}</p>
      <button
        type="button"
        className="mt-4 rounded-full bg-red-900 px-4 py-2 text-sm font-medium text-white hover:bg-red-800"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
