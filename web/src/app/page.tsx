import Link from "next/link";

/**
 * Marketing home explaining Eventsee’s marketplace positioning.
 */
export default function Home() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
        <p className="text-sm font-medium uppercase tracking-wide text-rose-700">Eventsee</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
          Book planners you actually click with — weddings, milestones, and company moments.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-zinc-600">
          Transparent budgets, verified reviews after confirmed bookings, live availability, and a short optional fit
          quiz to surface your top three matches.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/browse"
            className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Browse planners
          </Link>
          <Link
            href="/quiz"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:border-zinc-400"
          >
            Take the 7-question fit quiz
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Transparent pricing",
            body: "See real price ranges up front — no “request a quote” wall for discovery.",
          },
          {
            title: "Verified reviews",
            body: "Reviews unlock only after an in-app confirmed booking between you and the planner.",
          },
          {
            title: "Corporate + personal",
            body: "Separate intake flows for weddings and personal events vs offsites and client dinners.",
          },
        ].map((c) => (
          <div key={c.title} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">{c.title}</h2>
            <p className="mt-2 text-sm text-zinc-600">{c.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
