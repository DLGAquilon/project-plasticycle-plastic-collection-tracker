"use client";

import Link from "next/link";
import { useState } from "react";
import AuthPanel from "../../components/auth-panel.js";
import { DEMO_ACCOUNTS } from "../../lib/demo-accounts.js";

function destination(user) {
  if (user?.joinStatus === "pending" || user?.joinStatus === "declined") return "/pending";
  if (user?.isOwner && user?.setupComplete === false) return "/setup";
  return "/console";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function signIn(nextEmail, nextPassword) {
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Sign-in failed.");
        setPending(false);
        return;
      }
      window.location.href = destination(data.user);
    } catch {
      setError("The platform could not be reached. Try again.");
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-8 px-6 py-12 md:grid-cols-2">
        <AuthPanel title="Sign in to your competitions.">
          <p>You will only see contests your organization runs, or the single contest a viewer was enrolled in.</p>
        </AuthPanel>
        <section className="rise rounded-3xl border border-line bg-card p-7 shadow-sm" style={{ animationDelay: "80ms" }}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              signIn(email, password);
            }}
          >
            <label className="block text-sm font-medium" htmlFor="email">
              Email
              <input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
            </label>
            <label className="block text-sm font-medium" htmlFor="password">
              Password
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
            </label>
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            <button type="submit" disabled={pending} className="w-full rounded-full bg-forest px-4 py-3 font-semibold text-on-brand disabled:opacity-60">
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <Link href="/signup" className="mt-3 block rounded-full border border-line px-4 py-3 text-center text-sm font-semibold">
            Create an account
          </Link>
          <div className="mt-6 border-t border-line pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Demo accounts</p>
            <div className="mt-3 grid gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button key={account.email} type="button" disabled={pending} onClick={() => signIn(account.email, account.password)} className="rounded-2xl border border-line px-4 py-3 text-left hover:border-forest disabled:opacity-60">
                  <span className="block text-sm font-semibold">{account.label}</span>
                  <span className="block text-xs text-muted">{account.detail}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
