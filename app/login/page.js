"use client";

import Link from "next/link";
import { useState } from "react";
import AuthPanel from "../../components/auth-panel.js";

function destination(user) {
  if (user?.joinStatus === "pending" || user?.joinStatus === "declined") return "/pending";
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
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12 text-ink">
      <div className="grid w-full max-w-5xl items-stretch gap-8 md:grid-cols-2">
        <AuthPanel title="Welcome back, changemaker.">
          <p>Sign in to monitor live competition standings, verify participant logs, and accelerate your environmental goals.</p>
        </AuthPanel>
        <section className="rise h-full rounded-3xl border border-line bg-card p-7 shadow-sm" style={{ animationDelay: "80ms" }}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              signIn(email, password);
            }}
          >
            <label className="block text-sm font-medium" htmlFor="email">
              Email
              <input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="liza.santos@riverside.edu" className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
              <span className="mt-1 block text-xs font-normal text-muted">The address on your account, such as liza.santos@riverside.edu.</span>
            </label>
            <label className="block text-sm font-medium" htmlFor="password">
              Password
              <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Campus!Drive1" className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
              <span className="mt-1 block text-xs font-normal text-muted">The password you chose when the account was created.</span>
            </label>
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            <button type="submit" disabled={pending} className="w-full rounded-full bg-forest px-4 py-3 font-semibold text-on-brand disabled:opacity-60">
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <Link href="/signup" className="mt-3 block rounded-full border border-line px-4 py-3 text-center text-sm font-semibold">
            Create an account
          </Link>
        </section>
      </div>
    </main>
  );
}
