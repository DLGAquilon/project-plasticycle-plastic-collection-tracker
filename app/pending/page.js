"use client";

import { useEffect, useState } from "react";
import AuthPanel from "../../components/auth-panel.js";

export default function PendingPage() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok) {
          setError(data.error || "This page could not be opened.");
          return;
        }
        if (data.joinStatus === "active") {
          window.location.href = "/console";
          return;
        }
        setProfile(data);
      })
      .catch(() => setError("The platform could not be reached. Try again."));
  }, []);

  const declined = profile?.joinStatus === "declined";

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-8 px-6 py-12 md:grid-cols-2">
        <AuthPanel title="Waiting for your hub.">
          <p>An admin confirms the email before the account can open that organization’s competitions.</p>
        </AuthPanel>
        <section className="rounded-3xl border border-line bg-card p-7 shadow-sm">
          {profile ? (
            <>
              <p className="text-sm text-muted">{profile.organizationName}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{profile.name}</h2>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {declined
                  ? "This hub declined the request. The account is not inside their competitions."
                  : `A request for ${profile.name} is waiting. An admin of ${profile.organizationName} needs to confirm this email before you can enter.`}
              </p>
            </>
          ) : (
            <p className="text-muted">{error || "Checking the request…"}</p>
          )}
          <button
            type="button"
            className="mt-6 rounded-full border border-line px-4 py-3 text-sm font-semibold"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
          >
            Sign out
          </button>
        </section>
      </div>
    </main>
  );
}
