"use client";

import { useEffect, useState } from "react";
import Logo from "../../components/logo.js";
import ThemeToggle from "../../components/theme-toggle.js";

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const response = await fetch("/api/settings");
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!response.ok) {
      setError(data.error || "Settings could not be opened.");
      return;
    }
    setProfile(data);
  }

  useEffect(() => {
    load().catch(() => setError("The platform could not be reached. Try again."));
  }, []);

  async function requestRights() {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/settings/request", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "The request could not be sent.");
        setPending(false);
        return;
      }
      setMessage("The super admin can review this request on their competitions page.");
      await load();
    } catch {
      setError("The platform could not be reached. Try again.");
    }
    setPending(false);
  }

  async function redeem(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/settings/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "The invite code could not be used.");
        setPending(false);
        return;
      }
      setMessage("You are now a coordinator for this organization.");
      setCode("");
      await load();
    } catch {
      setError("The platform could not be reached. Try again.");
    }
    setPending(false);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <Logo className="text-3xl" />
          <ThemeToggle />
        </div>
        <h1 className="mt-8 text-4xl font-semibold tracking-tight">Settings</h1>
        {profile ? (
          <section className="mt-6 rounded-3xl border border-line bg-card p-7">
            <p className="text-sm text-muted">{profile.organizationName || "Platform"} · {profile.name}</p>
            <p className="mt-4 inline-flex rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent">{profile.badge}</p>
            {profile.canRequest ? (
              <div className="mt-6 space-y-4">
                <button type="button" onClick={requestRights} disabled={pending || profile.requestPending} className="w-full rounded-full bg-forest px-4 py-3 font-semibold text-on-brand disabled:opacity-60">
                  {profile.requestPending ? "Request waiting for review" : "Request Admin Privileges"}
                </button>
                <form className="space-y-3" onSubmit={redeem}>
                  <label className="block text-sm font-medium" htmlFor="invite-code">
                    Enter Admin Invite Code
                    <input id="invite-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3 uppercase outline-none focus:border-forest" placeholder="ABCD-EFGH" />
                  </label>
                  <button type="submit" disabled={pending || !code.trim()} className="w-full rounded-full border border-line px-4 py-3 font-semibold disabled:opacity-60">
                    Use invite code
                  </button>
                </form>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">
                {profile.isOwner
                  ? "Coordinator requests and invite codes are on your competitions page."
                  : "This account already has a staff role."}
              </p>
            )}
            {message ? <p className="mt-4 text-sm text-forest">{message}</p> : null}
            {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
            <a href="/console" className="mt-6 inline-block text-sm font-semibold text-forest">Back to competitions</a>
          </section>
        ) : (
          <p className="mt-8 text-muted">{error || "Opening settings…"}</p>
        )}
      </div>
    </main>
  );
}
