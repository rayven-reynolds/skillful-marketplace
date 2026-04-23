"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Me = { id: string; email: string; display_name: string | null; role: string };

/**
 * Registration form supporting client or planner roles for local demos.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"client" | "planner">("client");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch<Me>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name: displayName || null, role }),
      });
      router.push("/browse");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-100">
      <h1 className="text-2xl font-semibold">Create your Eventsee account</h1>
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
          Display name (optional)
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <label className="block text-xs font-medium text-zinc-700">
          Password (min 8 characters)
          <input
            type="password"
            minLength={8}
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <fieldset className="text-xs text-zinc-800">
          <legend className="font-medium text-zinc-700">I am signing up as</legend>
          <div className="mt-2 flex gap-3">
            <label className="flex items-center gap-2">
              <input type="radio" name="role" checked={role === "client"} onChange={() => setRole("client")} />A host
              hiring planners
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="role" checked={role === "planner"} onChange={() => setRole("planner")} />A planner
            </label>
          </div>
        </fieldset>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded-full bg-rose-700 py-2 text-sm font-medium text-white">
          Create account
        </button>
      </form>
      <p className="text-sm text-zinc-600">
        Already registered?{" "}
        <Link className="text-rose-800 underline" href="/login">
          Log in
        </Link>
      </p>
    </div>
  );
}
