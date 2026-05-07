"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Me = { id: string; email: string; display_name: string | null; role: string };

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null;
    try {
      await apiFetch<Me>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name: displayName }),
      });
      router.push("/browse");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-100">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Create your account</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Browse planners, save favourites, and get matched — for free.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="flex gap-3">
          <label className="flex-1 block text-xs font-medium text-zinc-700">
            First name
            <input
              className={inputCls}
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jane"
              autoComplete="given-name"
            />
          </label>
          <label className="flex-1 block text-xs font-medium text-zinc-700">
            Last name{" "}
            <span className="font-normal text-zinc-400">(optional)</span>
            <input
              className={inputCls}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              autoComplete="family-name"
            />
          </label>
        </div>

        <label className="block text-xs font-medium text-zinc-700">
          Email address
          <input
            type="email"
            required
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label className="block text-xs font-medium text-zinc-700">
          Password{" "}
          <span className="font-normal text-zinc-400">(min 8 characters)</span>
          <input
            type="password"
            minLength={8}
            required
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-rose-700 py-2.5 text-sm font-medium text-white transition hover:bg-rose-800 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-sm text-zinc-600">
        Want to offer your services?{" "}
        <Link className="font-medium text-rose-700 underline" href="/become-a-planner">
          Become a Planner
        </Link>{" "}
        after signing up.
      </p>

      <p className="text-sm text-zinc-600">
        Already registered?{" "}
        <Link className="font-medium text-rose-700 underline" href="/login">
          Log in
        </Link>
      </p>
    </div>
  );
}
