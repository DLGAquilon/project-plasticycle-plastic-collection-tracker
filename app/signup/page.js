"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "../../components/logo.js";
import ThemeToggle from "../../components/theme-toggle.js";

export default function SignupPage() {
  const [organizations, setOrganizations] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/public/organizations")
      .then((response) => response.json())
      .then((data) => {
        const rows = data.organizations || [];
        setOrganizations(rows);
        setOrganizationId(rows[0]?.id || "");
      })
      .catch(() => setError("The organization list could not be loaded."));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, organizationId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "The account could not be created.");
        setPending(false);
        return;
      }
      window.location.href = "/console";
    } catch {
      setError("The platform could not be reached. Try again.");
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-12 px-6 py-12 md:grid-cols-2">
        <section className="rise">
          <div className="flex items-center justify-between gap-4">
            <Logo className="text-3xl" />
            <ThemeToggle />
          </div>
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight">Create a viewer account.</h1>
          <p className="mt-4 text-muted">
            This page creates a viewer. You will see a competition only after an administrator enrolls you in it.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-muted">
            <li><strong className="text-ink">Viewer.</strong> Signs up here. Reads standings and the forecast for contests they were enrolled in.</li>
            <li><strong className="text-ink">Middleman.</strong> Weighs plastic. An organization admin creates this account.</li>
            <li><strong className="text-ink">Organization admin.</strong> Adds competitions, locks results, and enrolls people. A platform admin creates this account.</li>
          </ul>
        </section>
        <section className="rise rounded-3xl border border-line bg-card p-7 shadow-sm">
          <form className="space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium" htmlFor="signup-name">
              Name
              <input id="signup-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
            </label>
            <label className="block text-sm font-medium" htmlFor="signup-email">
              Email
              <input id="signup-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
            </label>
            <label className="block text-sm font-medium" htmlFor="signup-password">
              Password
              <input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
            </label>
            <label className="block text-sm font-medium" htmlFor="signup-org">
              Organization
              <select id="signup-org" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3" required>
                {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
            </label>
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            <button type="submit" disabled={pending || !organizationId} className="w-full rounded-full bg-forest px-4 py-3 font-semibold text-on-brand disabled:opacity-60">
              {pending ? "Creating…" : "Create viewer account"}
            </button>
          </form>
          <p className="mt-5 text-sm text-muted">
            Already registered? <Link href="/login" className="font-semibold text-forest">Sign in</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
