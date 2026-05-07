"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Me = { id: string; email: string; display_name: string | null; role: string };

/**
 * Email/password login form posting to the API auth routes.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch<Me>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push("/browse");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      if (raw.includes("Invalid credentials") || raw.includes("credentials")) {
        setError("No account found with those details. Please check your email or create an account.");
      } else if (raw.includes("not found") || raw.includes("404")) {
        setError("No account found. Please create an account first.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <form className="space-y-3" onSubmit={onSubmit}>
        <label className="block text-xs font-medium text-zinc-700">
          Email
          <input
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-zinc-700">
          Password
          <input
            type="password"
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded-full bg-zinc-900 py-2 text-sm font-medium text-white">
          Continue
        </button>
      </form>
      <p className="text-sm text-zinc-600">
        Need an account?{" "}
        <Link className="text-rose-800 underline" href="/register">
          Sign up
        </Link>
      </p>
    </div>
  );
}
