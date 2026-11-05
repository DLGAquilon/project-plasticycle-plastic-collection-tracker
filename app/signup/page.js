"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthPanel from "../../components/auth-panel.js";
import PasswordMeter from "../../components/password-meter.js";
import { assessPassword } from "../../lib/password-strength.js";

const TYPES = [
  ["barangay", "Barangay"],
  ["campus", "Campus Organization"],
  ["ngo", "NGO"],
  ["corporate", "Corporate ESG"],
  ["other", "Other (Specify)"],
];

function typeLabel(id, other) {
  if (id === "other") return other.trim() || "Other";
  return TYPES.find(([value]) => value === id)?.[1] || id;
}

export default function SignupPage() {
  const [mode, setMode] = useState("join");
  const [step, setStep] = useState("form");
  const [organizations, setOrganizations] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [organizationType, setOrganizationType] = useState("barangay");
  const [organizationTypeOther, setOrganizationTypeOther] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("hub") === "1") setMode("create");
    const preset = params.get("email");
    if (preset) setEmail(preset);
    fetch("/api/public/organizations")
      .then((response) => response.json())
      .then((data) => setOrganizations(data.organizations || []))
      .catch(() => setError("The organization list could not be loaded."));
  }, []);

  const selected = organizations.find((org) => org.id === organizationId) || null;
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return organizations;
    return organizations.filter((org) => org.name.toLowerCase().includes(term));
  }, [organizations, search]);

  function chooseMode(next) {
    setMode(next);
    setStep("form");
    setError("");
  }

  function review(event) {
    event.preventDefault();
    setError("");
    if (mode === "join" && !selected) {
      setError("Search for the community hub you belong to.");
      return;
    }
    if (mode === "create" && organizationType === "other" && organizationTypeOther.trim().length < 2) {
      setError("Specify the organization type, between 2 and 40 characters.");
      return;
    }
    if (!assessPassword(password).ready) {
      setError("Meet every password criterion before you review the account.");
      return;
    }
    setStep("review");
  }

  async function submit() {
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

  const hubLabel = mode === "create" ? organizationName : selected?.name;
  const hubType = mode === "create" ? typeLabel(organizationType, organizationTypeOther) : (selected?.type_label || "Community hub");

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid max-w-5xl items-start gap-8 px-6 py-12 md:grid-cols-2">
        <AuthPanel title={mode === "create" ? "Power Your Community's Impact." : "Every Action Counts."}>
          <p>
            {mode === "create"
              ? "Launch a new organization hub or request to join an existing one. Review the role guidelines below to get started on tracking your recycling milestones."
              : "Join your community’s recycling hub, track your personal diversion metrics, and collaborate with local coordinators. Once you submit your request, a hub admin will verify your account to get you started."}
          </p>
          <div className="mt-6 border-t border-line pt-5">
              <h1 className="text-xl font-medium italic text-center">How will you be contributing?</h1>
          </div>
          <ul className="space-y-3">
            <li><strong className="text-[#f8fafc]">Participant/Viewer.</strong> Asks to join an existing hub and waits for an admin to confirm the email.</li>
            <li><strong className="text-[#f8fafc]">Head Admin.</strong> Registers a new organization name and owns that hub.</li>
            <li><strong className="text-[#f8fafc]">Coordinator.</strong> A viewer who is promoted with an invite code or an approved request.</li>
          </ul>
        </AuthPanel>
        <section className="rise rounded-3xl border border-line bg-card p-7 shadow-sm">
          <div className="mb-5 grid grid-cols-2 rounded-full border border-line p-1 text-sm font-semibold">
            <button type="button" onClick={() => chooseMode("join")} className={`rounded-full px-3 py-2 ${mode === "join" ? "bg-forest text-on-brand" : ""}`}>
              Join
            </button>
            <button type="button" onClick={() => chooseMode("create")} className={`rounded-full px-3 py-2 ${mode === "create" ? "bg-forest text-on-brand" : ""}`}>
              New hub
            </button>
          </div>
          {step === "form" ? (
            <form className="space-y-4" onSubmit={review}>
              <label className="block text-sm font-medium" htmlFor="signup-name">
                Your name
                <input id="signup-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Liza Santos" className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
                <span className="mt-1 block text-xs font-normal text-muted">The name people in your hub will see, such as Liza Santos.</span>
              </label>
              <label className="block text-sm font-medium" htmlFor="signup-email">
                Email
                <input id="signup-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="liza.santos@riverside.edu" className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
                <span className="mt-1 block text-xs font-normal text-muted">You will sign in with this address.</span>
              </label>
              <label className="block text-sm font-medium" htmlFor="signup-password">
                Password
                <input id="signup-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Campus!Drive1" className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
                <span className="mt-1 block text-xs font-normal text-muted">A sample shape is Campus!Drive1. Use your own before you review.</span>
                <PasswordMeter password={password} />
              </label>
              {mode === "join" ? (
                <div>
                  <p className="text-sm font-medium">Search your organization</p>
                  <span className="mt-1 block text-xs font-normal text-muted">Look up the hub you already belong to, such as Riverside University.</span>
                  <button type="button" onClick={() => { setSearch(""); setSearchOpen(true); }} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 text-left">
                    {selected ? selected.name : "Find your community hub"}
                  </button>
                </div>
              ) : (
                <>
                  <label className="block text-sm font-medium" htmlFor="signup-hub">
                    Organization name
                    <input id="signup-hub" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Riverside University" className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
                    <span className="mt-1 block text-xs font-normal text-muted">A unique hub name, such as Riverside University.</span>
                  </label>
                  <label className="block text-sm font-medium" htmlFor="signup-type">
                    Organization type
                    <select id="signup-type" value={organizationType} onChange={(event) => setOrganizationType(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3">
                      {TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                    </select>
                    <span className="mt-1 block text-xs font-normal text-muted">Barangay, campus, NGO, company, or a type you name.</span>
                  </label>
                  {organizationType === "other" ? (
                    <label className="block text-sm font-medium" htmlFor="signup-other">
                      Other (Specify)
                      <input id="signup-other" value={organizationTypeOther} onChange={(event) => setOrganizationTypeOther(event.target.value)} placeholder="Homeowners association" className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
                      <span className="mt-1 block text-xs font-normal text-muted">2 to 40 characters, such as Homeowners association.</span>
                    </label>
                  ) : null}
                </>
              )}
              {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
              <button type="submit" className="w-full rounded-full bg-forest px-4 py-3 font-semibold text-on-brand">
                Review details
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Check this before you continue.</h2>
              <dl className="space-y-3 rounded-2xl border border-line px-4 py-4 text-sm">
                <div>
                  <dt className="text-muted">Name</dt>
                  <dd className="font-semibold">{name}</dd>
                </div>
                <div>
                  <dt className="text-muted">Email</dt>
                  <dd className="font-semibold">{email}</dd>
                </div>
                <div>
                  <dt className="text-muted">Organization</dt>
                  <dd className="font-semibold">{hubLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted">Type</dt>
                  <dd className="font-semibold">{hubType}</dd>
                </div>
              </dl>
              <p className="text-sm text-muted">
                {mode === "join"
                  ? `You are asking to join ${hubLabel}. An admin must confirm ${email} before the account can open their competitions.`
                  : `You are creating ${hubLabel} and will be its head admin.`}
              </p>
              {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
              <button type="button" onClick={submit} disabled={pending} className="w-full rounded-full bg-forest px-4 py-3 font-semibold text-on-brand disabled:opacity-60">
                {pending ? "Sending…" : mode === "create" ? "Confirm and create the hub" : "Confirm and request to join"}
              </button>
              <button type="button" onClick={() => { setStep("form"); setError(""); }} className="w-full rounded-full border border-line px-4 py-3 text-sm font-semibold">
                Edit details
              </button>
            </div>
          )}
          <p className="mt-5 text-sm text-muted">
            Already registered? <Link href="/login" className="font-semibold text-forest">Sign in</Link>.
          </p>
        </section>
      </div>
      {searchOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[#0f172a]/55 px-4" role="presentation" onClick={() => setSearchOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="org-search-title" className="w-full max-w-md rounded-3xl border border-line bg-card p-6 text-ink shadow-sm" onClick={(event) => event.stopPropagation()}>
            <h2 id="org-search-title" className="text-xl font-semibold">Search your organization</h2>
            <label className="mt-4 block text-sm font-medium" htmlFor="org-search">
              Organization name
              <input id="org-search" value={search} onChange={(event) => setSearch(event.target.value)} autoFocus placeholder="Riverside University" className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" />
              <span className="mt-1 block text-xs font-normal text-muted">Type part of the hub name, such as Riverside.</span>
            </label>
            <ul className="mt-4 max-h-64 space-y-2 overflow-auto">
              {matches.map((org) => (
                <li key={org.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOrganizationId(org.id);
                      setSearchOpen(false);
                    }}
                    className="w-full rounded-2xl border border-line px-4 py-3 text-left hover:border-forest"
                  >
                    <span className="block font-semibold">{org.name}</span>
                    <span className="block text-xs text-muted">{org.type_label || "Community hub"}</span>
                  </button>
                </li>
              ))}
            </ul>
            {matches.length === 0 ? <p className="mt-4 text-sm text-muted">No community hub matches that name. Create a new hub if yours is not here yet.</p> : null}
            <button type="button" onClick={() => setSearchOpen(false)} className="mt-4 text-sm font-semibold text-forest">Close</button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
