"use client";

import { useEffect, useState } from "react";
import Logo from "../../components/logo.js";
import ThemeToggle from "../../components/theme-toggle.js";

export default function SetupPage() {
  const [ready, setReady] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [rules, setRules] = useState("");
  const [minKilos, setMinKilos] = useState("0.01");
  const [maxKilos, setMaxKilos] = useState("5000");
  const [logo, setLogo] = useState(null);
  const [hasLogo, setHasLogo] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (response.status === 403) {
          window.location.href = "/console";
          return;
        }
        if (!response.ok) {
          setError(data.error || "The setup wizard could not be opened.");
          return;
        }
        setOrganizationName(data.organizationName || "");
        setRules(data.campaignRules || "");
        setMinKilos(String(data.minKilos ?? "0.01"));
        setMaxKilos(String(data.maxKilos ?? "5000"));
        setHasLogo(Boolean(data.hasLogo));
        setReady(true);
      })
      .catch(() => setError("The platform could not be reached. Try again."));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      if (logo) {
        const form = new FormData();
        form.set("logo", logo);
        const uploaded = await fetch("/api/setup/logo", { method: "POST", body: form });
        const uploadData = await uploaded.json().catch(() => ({}));
        if (!uploaded.ok) {
          setError(uploadData.error || "The logo could not be saved.");
          setPending(false);
          return;
        }
        setHasLogo(true);
      }
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignRules: rules, minKilos, maxKilos }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "The setup could not be saved.");
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
      <div className="mx-auto max-w-xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <Logo className="text-3xl" />
          <ThemeToggle />
        </div>
        <p className="mt-8 text-sm font-semibold uppercase tracking-widest text-muted">Super admin setup</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Set up {organizationName || "your hub"}.</h1>
        <p className="mt-3 text-muted">Campaign rules, a logo, and the kilograms a middleman may record on one weigh-in.</p>
        {ready ? (
          <form className="mt-8 space-y-4 rounded-3xl border border-line bg-card p-7" onSubmit={submit}>
            <label className="block text-sm font-medium" htmlFor="setup-rules">
              Campaign rules
              <textarea id="setup-rules" value={rules} onChange={(event) => setRules(event.target.value)} rows={5} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" placeholder="Who may bring plastic, how a purok or department is scored, and when the contest locks." />
            </label>
            <label className="block text-sm font-medium" htmlFor="setup-logo">
              Branding logo
              <input id="setup-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setLogo(event.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
            </label>
            {hasLogo ? <img src="/api/branding/logo" alt="" className="h-16 w-16 rounded-2xl object-cover" /> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium" htmlFor="setup-min">
                Lightest weigh-in (kg)
                <input id="setup-min" inputMode="decimal" value={minKilos} onChange={(event) => setMinKilos(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
              </label>
              <label className="block text-sm font-medium" htmlFor="setup-max">
                Heaviest weigh-in (kg)
                <input id="setup-max" inputMode="decimal" value={maxKilos} onChange={(event) => setMaxKilos(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 outline-none focus:border-forest" required />
              </label>
            </div>
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            <button type="submit" disabled={pending} className="w-full rounded-full bg-forest px-4 py-3 font-semibold text-on-brand disabled:opacity-60">
              {pending ? "Saving…" : "Save and open competitions"}
            </button>
          </form>
        ) : (
          <p className="mt-8 text-muted">{error || "Opening the setup wizard…"}</p>
        )}
      </div>
    </main>
  );
}
