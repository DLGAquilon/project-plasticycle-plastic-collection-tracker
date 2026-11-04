"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "../../components/logo.js";
import ThemeToggle from "../../components/theme-toggle.js";

const TYPES = [
  ["barangay", "Barangay"],
  ["campus", "Campus Organization"],
  ["ngo", "NGO"],
  ["corporate", "Corporate ESG"],
  ["other", "Other (Specify)"],
];

export default function SignupPage() {
  const [mode, setMode] = useState("join");
  const [organizations, setOrganizations] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("barangay");
  const [organizationTypeOther, setOrganizationTypeOther] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const hub = new URLSearchParams(window.location.search).get("hub");
    if (hub === "1") setMode("create");
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
    const body = mode === "create"
      ? { mode, name, email, password, organizationName, organizationType, organizationTypeOther }
      : { mode, name, email, password, organizationId };
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "The account could not be created.");
        setPending(false);
        return;
      }
      window.location.href = data.next || "/console";
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
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight">
            {mode === "create" ? "Open your community hub." : "Join as a participant."}
          </h1>
          <p className="mt-4 text-muted">
            {mode === "create"
              ? "The first account on a new organization is the super admin. You will set the campaign rules, logo, and weigh-in limits next."
              : "A viewer sees a competition only after an administrator enrolls them. Coordinator access comes later, by invite or approval."}
          </p>
          <ul className="mt-6 space-y-3 text-sm text-muted">
            <li><strong className="text-ink">Participant/Viewer.</strong> Joins an existing organization and reads the contests they are enrolled in.</li>
            <li><strong className="text-ink">Super admin.</strong> Registers a new organization name and owns that hub.</li>
            <li><strong className="text-ink">Coordinator.</strong> A viewer who is promoted with an invite code or an approved request.</li>
          </ul>
        </section>
        <section className="rise rounded-3xl border border-line bg-card p-7 shadow-sm">
          <div className="mb-5 grid grid-cols-2 rounded-full border border-line p-1 text-sm font-semibold">
            <button type="button" onClick={() => setMode("join")} className={`rounded-full px-3 py-2 ${mode === "join" ? "bg-forest text-on-brand" : ""}`}>
              Join
            </button>
            <button type="button" onClick={() => setMode("create")} className={`rounded-full px-3 py-2 ${mode === "create" ? "bg-forest text-on-brand" : ""}`}>
              New hub
            </button>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium" htmlFor="signup-name">
              Your name
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
            {mode === "join" ? (
              <label className="block text-sm font-medium" htmlFor="signup-org">
                Organization
                <select id="signup-org" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3" required>
                  {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
              </label>
            ) : (
              <>
                <label className="block text-sm font-medium" htmlFor="signup-hub">
                  Organization name
                  <input id="signup-hub" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
                </label>
                <label className="block text-sm font-medium" htmlFor="signup-type">
                  Organization type
                  <select id="signup-type" value={organizationType} onChange={(event) => setOrganizationType(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3">
                    {TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                  </select>
                </label>
                {organizationType === "other" ? (
                  <label className="block text-sm font-medium" htmlFor="signup-other">
                    Other (Specify)
                    <input id="signup-other" value={organizationTypeOther} onChange={(event) => setOrganizationTypeOther(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
                  </label>
                ) : null}
              </>
            )}
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            <button type="submit" disabled={pending || (mode === "join" && !organizationId)} className="w-full rounded-full bg-forest px-4 py-3 font-semibold text-on-brand disabled:opacity-60">
              {pending ? "Creating…" : mode === "create" ? "Create the hub" : "Create viewer account"}
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
