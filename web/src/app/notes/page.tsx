"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type Me = { id: string } | null;
type ChecklistResp = { progress: Record<string, string | unknown> };

const NOTES_KEY = "eventsee_notes";

export default function NotesPage() {
  const [me, setMe] = useState<Me | "loading">("loading");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiFetch<NonNullable<Me>>("/auth/me")
      .then((u) => {
        setMe(u);
        // Load notes from checklist progress JSON
        apiFetch<ChecklistResp>("/me/checklist")
          .then((d) => {
            const stored = (d?.progress?.[NOTES_KEY] ?? "") as string;
            setNotes(stored);
          })
          .catch(() => {
            setNotes(localStorage.getItem(NOTES_KEY) ?? "");
          });
      })
      .catch(() => setMe(null));
  }, []);

  function handleChange(value: string) {
    setNotes(value);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        await apiFetch("/me/checklist", {
          method: "PUT",
          body: JSON.stringify({ progress: { [NOTES_KEY]: value } }),
        });
      } catch {
        localStorage.setItem(NOTES_KEY, value);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  }

  if (me === "loading") return null;

  if (!me) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Sign in to use notes</h1>
        <p className="mt-2 text-sm text-zinc-500">Your notes are saved to your account.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/login" className="rounded-full bg-rose-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-800">Log in</Link>
          <Link href="/register" className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-900">Sign up</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">My Notes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Jot down ideas, questions for planners, or event details.
          </p>
        </div>
        {saved && (
          <span className="text-xs font-medium text-emerald-600">Saved ✓</span>
        )}
      </div>

      <textarea
        className="h-96 w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 shadow-sm outline-none placeholder:text-zinc-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
        placeholder="Start typing…"
        value={notes}
        onChange={(e) => handleChange(e.target.value)}
      />

      <p className="text-xs text-zinc-400">
        Notes auto-save as you type and are private to your account.
      </p>
    </div>
  );
}
