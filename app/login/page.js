"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthPanel from "../../components/auth-panel.js";
import { DEMO_ACCOUNTS } from "../../lib/demo-accounts.js";

const NOTICES = {
  missing: "This email does not belong to an account.",
  inactive: "This account is turned off. Ask an admin to restore it.",
  denied: "Google sign-in was cancelled.",
  google: "Google sign-in needs a client ID and secret in .env.local before it can open.",
  failed: "Google could not confirm that email. Try again.",
};

function destination(user) {
  if (user?.joinStatus === "pending" || user?.joinStatus === "declined") return "/pending";
  if (user?.isOwner && user?.setupComplete === false) return "/setup";
  return "/console";
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l6.3 5.3C37.4 38.2 44 33 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("email");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notice = NOTICES[params.get("notice") || ""];
    if (notice) setError(notice);
    const preset = params.get("email");
    if (preset) setEmail(preset);
  }, []);

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

  async function checkEmail(event) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "The email could not be checked.");
        setPending(false);
        return;
      }
      if (!data.exists) {
        setError(data.reason === "inactive"
          ? "This account is turned off. Ask an admin to restore it."
          : "This email does not belong to an account.");
        setPending(false);
        return;
      }
      setStep("password");
      setPending(false);
    } catch {
      setError("The platform could not be reached. Try again.");
      setPending(false);
    }
  }

  const signupHref = email.trim() ? `/signup?email=${encodeURIComponent(email.trim())}` : "/signup";

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-8 px-6 py-12 md:grid-cols-2">
        <AuthPanel title="Sign in to your competitions.">
          <p>You will only see contests your organization runs, or the single contest a viewer was enrolled in.</p>
        </AuthPanel>
        <section className="rise rounded-3xl border border-line bg-card p-7 shadow-sm" style={{ animationDelay: "80ms" }}>
          <a href="/api/auth/google" className="flex w-full items-center justify-center gap-3 rounded-full border border-line px-4 py-3 text-sm font-semibold">
            <GoogleMark />
            Continue with Google
          </a>
          <p className="my-4 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">or use email</p>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              if (step === "email") {
                checkEmail(event);
                return;
              }
              event.preventDefault();
              signIn(email, password);
            }}
          >
            <label className="block text-sm font-medium" htmlFor="email">
              Email
              <input id="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} readOnly={step === "password"} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest read-only:text-muted" required />
            </label>
            {step === "password" ? (
              <label className="block text-sm font-medium" htmlFor="password">
                Password
                <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required autoFocus />
              </label>
            ) : null}
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            <button type="submit" disabled={pending} className="w-full rounded-full bg-forest px-4 py-3 font-semibold text-on-brand disabled:opacity-60">
              {pending ? (step === "email" ? "Checking…" : "Signing in…") : step === "email" ? "Continue" : "Sign in"}
            </button>
            {step === "password" ? (
              <button
                type="button"
                className="w-full text-sm font-semibold text-muted"
                onClick={() => {
                  setStep("email");
                  setPassword("");
                  setError("");
                }}
              >
                Use a different email
              </button>
            ) : null}
          </form>
          <Link href={signupHref} className="mt-3 block rounded-full border border-line px-4 py-3 text-center text-sm font-semibold">
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
