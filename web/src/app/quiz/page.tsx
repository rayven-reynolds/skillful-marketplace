"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

type Match = { planner_profile_id: string; slug: string; score: number };

type QuizQuestion = {
  id: string;
  label: string;
  type: "text" | "chips" | "number" | "date";
  options?: string[];
};

const QUESTIONS: QuizQuestion[] = [
  { id: "location", label: "Where is your event?", type: "text" },
  {
    id: "planning_styles",
    label: "Planning style (pick any)",
    type: "chips",
    options: ["full_service", "partial_planning", "month_of", "day_of"],
  },
  {
    id: "aesthetic_tags",
    label: "Vibe (pick any)",
    type: "chips",
    options: ["modern_minimal", "garden_romantic", "maximal_color", "classic_formal"],
  },
  {
    id: "specialties",
    label: "Needs (pick any)",
    type: "chips",
    options: ["south_asian", "lgbtq_inclusive", "multicultural", "religious_jewish"],
  },
  {
    id: "event_sizes",
    label: "Guest scale (pick any)",
    type: "chips",
    options: ["under_50", "50_150", "150_300", "300_plus"],
  },
  { id: "budget_max", label: "Rough max budget (USD)", type: "number" },
  { id: "event_date", label: "Event date (optional)", type: "date" },
];

/**
 * Optional seven-question fit quiz with skip-to-browse affordance.
 */
export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const progress = useMemo(() => Math.round(((step + 1) / QUESTIONS.length) * 100), [step]);

  async function finish() {
    try {
      const eventDate = typeof answers.event_date === "string" && answers.event_date ? answers.event_date : undefined;
      const payloadAnswers = { ...answers };
      if (payloadAnswers.event_date) delete payloadAnswers.event_date;
      const body = { answers: payloadAnswers, event_date: eventDate ?? null };
      const res = await apiFetch<{ matches: Match[] }>(`/quiz/match`, { method: "POST", body: JSON.stringify(body) });
      setMatches(res.matches);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quiz failed");
    }
  }

  const q = QUESTIONS[step];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Fit quiz</h1>
        <Link href="/browse" className="text-sm text-rose-700 hover:underline">
          Skip and browse
        </Link>
      </div>
      <p className="text-sm text-zinc-600">Up to seven quick questions — we will suggest your top three planners.</p>
      <div className="h-1 w-full rounded-full bg-zinc-200">
        <div className="h-1 rounded-full bg-rose-600 transition-all" style={{ width: `${progress}%` }} />
      </div>
      {matches ? (
        <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
          <h2 className="text-lg font-semibold">Your top matches</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {matches.map((m) => (
              <li key={m.planner_profile_id}>
                <Link className="font-medium text-rose-800 hover:underline" href={`/planners/${m.slug}`}>
                  {m.slug}
                </Link>{" "}
                <span className="text-zinc-500">(score {m.score.toFixed(1)})</span>
              </li>
            ))}
          </ol>
          <Link href="/browse" className="inline-block text-sm text-zinc-700 hover:underline">
            Continue browsing with filters
          </Link>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
          <p className="text-sm font-medium text-zinc-900">
            {step + 1}/{QUESTIONS.length} — {q.label}
          </p>
          {q.type === "text" && (
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={String(answers[q.id] ?? "")}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
            />
          )}
          {q.type === "number" && (
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              type="number"
              value={String(answers[q.id] ?? "")}
              onChange={(e) => setAnswers({ ...answers, [q.id]: Number(e.target.value) })}
            />
          )}
          {q.type === "date" && (
            <input
              type="date"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={String(answers[q.id] ?? "")}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
            />
          )}
          {q.type === "chips" && q.options && (
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const selected = new Set<string>((answers[q.id] as string[] | undefined) ?? []);
                const on = selected.has(opt);
                return (
                  <button
                    type="button"
                    key={opt}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      on ? "border-rose-700 bg-rose-50 text-rose-900" : "border-zinc-300 text-zinc-800"
                    }`}
                    onClick={() => {
                      const next = new Set<string>((answers[q.id] as string[] | undefined) ?? []);
                      if (next.has(opt)) next.delete(opt);
                      else next.add(opt);
                      setAnswers({ ...answers, [q.id]: Array.from(next) });
                    }}
                  >
                    {opt.replaceAll("_", " ")}
                  </button>
                );
              })}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-between gap-2">
            <button
              type="button"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </button>
            {step < QUESTIONS.length - 1 ? (
              <button
                type="button"
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white"
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </button>
            ) : (
              <button type="button" className="rounded-full bg-rose-700 px-4 py-2 text-sm text-white" onClick={finish}>
                See matches
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
