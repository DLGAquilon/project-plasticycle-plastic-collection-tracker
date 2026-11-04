"use client";

import { useEffect, useState } from "react";
import Logo from "../../components/logo.js";
import ThemeToggle from "../../components/theme-toggle.js";
import { formatWhen } from "../../lib/time.js";

function kg(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function prettyDate(iso) {
  const [year, month, day] = String(iso || "").split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (!year || !month || !day) return iso;
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Sign in required.");
  }
  if (!response.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}

export default function ConsoleApp() {
  const [list, setList] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [room, setRoom] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function loadList() {
    const data = await api("/api/competitions");
    setList(data);
    return data;
  }

  async function openCompetition(id) {
    setError("");
    setAdding(false);
    setSelectedId(id);
    const data = await api(`/api/competitions/${id}`);
    setRoom(data);
  }

  useEffect(() => {
    loadList().catch((reason) => setError(reason.message));
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  if (!list) {
    return <main className="grid min-h-screen place-items-center bg-paper text-muted">{error || "Opening your competitions…"}</main>;
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-card/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <Logo className="text-2xl" />
            <p className="text-sm text-muted">
              {list.user.organizationName || "Platform"} · {list.user.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button type="button" onClick={signOut} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-8">
        {error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
        {selectedId && room ? (
          <CompetitionRoom
            room={room}
            onBack={() => {
              setSelectedId("");
              setRoom(null);
              loadList().catch((reason) => setError(reason.message));
            }}
            onReload={() => openCompetition(selectedId)}
            onError={setError}
          />
        ) : adding ? (
          <AddCompetition
            onCancel={() => setAdding(false)}
            onCreated={async (id) => {
              setAdding(false);
              await loadList();
              await openCompetition(id);
            }}
            onError={setError}
          />
        ) : (
          <CompetitionList list={list} onOpen={openCompetition} onAdd={() => { setError(""); setAdding(true); }} />
        )}
      </div>
    </main>
  );
}

function CompetitionList({ list, onOpen, onAdd }) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your competitions</h1>
          <p className="mt-2 max-w-xl text-muted">
            Each contest stays with the people enrolled in it. A barangay ranks puroks. A campus or company ranks departments.
          </p>
        </div>
        {list.canAdd ? (
          <button type="button" onClick={onAdd} className="rounded-full bg-forest px-5 py-3 font-semibold text-on-brand">
            Add competition
          </button>
        ) : null}
      </div>
      {list.competitions.length === 0 ? (
        <p className="rise mt-8 rounded-3xl border border-line bg-card p-6 text-muted">
          Nothing is on your list yet. An administrator enrolls viewers into one competition at a time.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {list.competitions.map((competition, index) => (
            <li key={competition.id} className="rise" style={{ animationDelay: `${index * 70}ms` }}>
              <button type="button" onClick={() => onOpen(competition.id)} className="w-full rounded-3xl border border-line bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-forest">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold">{competition.kindLabel}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${competition.locked ? "bg-clay/15 text-clay" : "bg-accent/15 text-accent"}`}>
                    {competition.locked ? "Locked" : "Open"}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">{competition.name}</h2>
                <p className="mt-1 text-sm text-muted">{prettyDate(competition.startsOn)} to {prettyDate(competition.endsOn)} · {competition.participantCount} {competition.participantsLabel.toLowerCase()}</p>
                <p className="mt-4 text-lg font-bold">{kg(competition.totalKilos)} kg</p>
                <p className="text-sm text-muted">{competition.leaderName ? `Leading: ${competition.leaderName}` : "No weigh-ins yet"}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {list.canInvite ? <InviteForm list={list} /> : null}
    </section>
  );
}

function InviteForm({ list }) {
  const roles = list.user.role === "platform_admin"
    ? [["org_admin", "Organization admin"], ["middleman", "Middleman"], ["viewer", "Viewer"]]
    : [["middleman", "Middleman"], ["viewer", "Viewer"]];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(roles[0][0]);
  const [organizationId, setOrganizationId] = useState(list.organizations?.[0]?.id || "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    try {
      const created = await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          organizationId: list.user.role === "platform_admin" ? organizationId : undefined,
        }),
      });
      setMessage(`${created.name} can sign in. The role is fixed as ${created.role.replaceAll("_", " ")}.`);
      setName("");
      setEmail("");
      setPassword("");
    } catch (reason) {
      setError(reason.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 rounded-3xl border border-line bg-card p-6">
      <h2 className="text-xl font-semibold">Add a staff account</h2>
      <p className="mt-1 text-sm text-muted">
        Public signup can only create a viewer. Middlemen and administrators are added here, by someone who already holds that authority.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3" required />
        </label>
        <label className="text-sm font-medium">
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3" required />
        </label>
        <label className="text-sm font-medium">
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3" required />
        </label>
        <label className="text-sm font-medium">
          Role
          <select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3">
            {roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {list.user.role === "platform_admin" ? (
          <label className="text-sm font-medium md:col-span-2">
            Organization
            <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3">
              {(list.organizations || []).map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
          </label>
        ) : null}
      </div>
      {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {message ? <p className="mt-3 rounded-2xl bg-accent/10 px-4 py-3 text-sm text-accent">{message}</p> : null}
      <button disabled={pending} className="mt-4 rounded-full bg-forest px-5 py-3 font-semibold text-on-brand disabled:opacity-60">
        {pending ? "Saving…" : "Create account"}
      </button>
    </form>
  );
}

function AddCompetition({ onCancel, onCreated, onError }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("barangay");
  const [startsOn, setStartsOn] = useState("2026-01-01");
  const [endsOn, setEndsOn] = useState("2026-12-31");
  const [participants, setParticipants] = useState("");
  const [pending, setPending] = useState(false);
  const noun = kind === "barangay" ? "puroks" : "departments";

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    onError("");
    try {
      const created = await api("/api/competitions", {
        method: "POST",
        body: JSON.stringify({
          name,
          kind,
          startsOn,
          endsOn,
          participants: participants.split("\n"),
        }),
      });
      await onCreated(created.id);
    } catch (reason) {
      onError(reason.message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rise rounded-3xl border border-line bg-card p-6">
      <button type="button" onClick={onCancel} className="text-sm font-semibold text-forest">Back to competitions</button>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Add a competition</h1>
      <p className="mt-2 text-muted">The type decides the words on the board, so a barangay contest never mixes with campus departments.</p>
      <fieldset className="mt-6 grid gap-3 md:grid-cols-3">
        <legend className="sr-only">Competition type</legend>
        {[
          ["barangay", "Barangay", "Participants are puroks."],
          ["campus", "Campus", "Participants are departments."],
          ["company", "Company", "Participants are departments."],
        ].map(([id, title, text]) => (
          <label key={id} className={`cursor-pointer rounded-2xl border p-4 ${kind === id ? "border-forest bg-forest/5" : "border-line"}`}>
            <input className="sr-only" type="radio" name="kind" value={id} checked={kind === id} onChange={() => setKind(id)} />
            <span className="block font-semibold">{title}</span>
            <span className="mt-1 block text-sm text-muted">{text}</span>
          </label>
        ))}
      </fieldset>
      <label className="mt-5 block text-sm font-medium" htmlFor="comp-name">
        Name
        <input id="comp-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3" required />
      </label>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium" htmlFor="comp-start">
          Starts
          <input id="comp-start" type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3" required />
        </label>
        <label className="text-sm font-medium" htmlFor="comp-end">
          Ends
          <input id="comp-end" type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3" required />
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium" htmlFor="comp-people">
        {noun[0].toUpperCase() + noun.slice(1)}, one per line
        <textarea id="comp-people" value={participants} onChange={(event) => setParticipants(event.target.value)} rows={5} placeholder={kind === "barangay" ? "Purok 1\nPurok 4" : "College of Engineering\nCollege of Business"} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3" required />
      </label>
      <button disabled={pending} className="mt-5 rounded-full bg-forest px-5 py-3 font-semibold text-on-brand disabled:opacity-60">
        {pending ? "Saving…" : "Create competition"}
      </button>
    </form>
  );
}

function CompetitionRoom({ room, onBack, onReload, onError }) {
  const { competition, standings, access } = room;
  const [unitId, setUnitId] = useState(standings[0]?.id || "");
  const [kilos, setKilos] = useState("");
  const [step, setStep] = useState("edit");
  const [pending, setPending] = useState(false);
  const [locking, setLocking] = useState(false);
  const [viewerId, setViewerId] = useState(room.enrollable[0]?.id || "");
  const max = Math.max(...standings.map((row) => row.kilos), 0);
  const place = standings.find((row) => row.id === unitId);

  async function record() {
    setPending(true);
    try {
      await api("/api/collections", {
        method: "POST",
        body: JSON.stringify({ competitionId: competition.id, unitId, kilos, clientRequestId: crypto.randomUUID() }),
      });
      setKilos("");
      setStep("edit");
      await onReload();
    } catch (reason) {
      onError(reason.message);
    } finally {
      setPending(false);
    }
  }

  async function lock() {
    setPending(true);
    try {
      await api(`/api/competitions/${competition.id}/lock`, { method: "POST" });
      setLocking(false);
      await onReload();
    } catch (reason) {
      onError(reason.message);
    } finally {
      setPending(false);
    }
  }

  async function enroll(event) {
    event.preventDefault();
    setPending(true);
    try {
      await api(`/api/competitions/${competition.id}/enroll`, { method: "POST", body: JSON.stringify({ userId: viewerId }) });
      await onReload();
    } catch (reason) {
      onError(reason.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-forest">All competitions</button>
      <div className="rise flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">{competition.kindLabel}</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">{competition.name}</h1>
          <p className="mt-2 text-muted">{prettyDate(competition.startsOn)} to {prettyDate(competition.endsOn)}</p>
        </div>
        {access.lock ? (
          <button type="button" onClick={() => setLocking(true)} className="rounded-full border border-clay px-4 py-2 text-sm font-semibold text-clay">
            Lock competition
          </button>
        ) : null}
      </div>

      {competition.locked ? (
        <p className="rounded-3xl bg-clay px-5 py-4 text-on-locked">This competition is locked. Weigh-ins are closed, and this is the final ranking.</p>
      ) : null}

      {locking ? (
        <div className="rounded-3xl border border-clay/40 bg-card p-5">
          <p className="font-semibold">Lock this ranking?</p>
          <p className="mt-1 text-sm text-muted">No one can add kilograms after this. The standings stay as they are.</p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setLocking(false)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">Cancel</button>
            <button type="button" disabled={pending} onClick={lock} className="rounded-full bg-clay px-4 py-2 text-sm font-semibold text-on-locked disabled:opacity-60">Lock it</button>
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="text-xl font-semibold">{competition.locked ? "Final standings" : "Standings"}</h2>
        <ol className="rank-list mt-5 space-y-2">
          {standings.map((row, index) => (
            <li key={row.id} className="rise px-3 py-2" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="font-semibold">{row.rank}. {row.name}</span>
                <span className="font-bold">{kg(row.kilos)} kg</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div className="h-2 rounded-full bg-accent transition-all duration-700" style={{ width: `${max ? Math.max(row.kilos ? 6 : 0, (row.kilos / max) * 100) : 0}%` }} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {access.log ? (
        <section className="rounded-3xl border border-line bg-card p-6">
          <h2 className="text-xl font-semibold">Log plastic</h2>
          {step === "confirm" ? (
            <div className="mt-4">
              <p className="text-lg">Credit <strong>{kg(kilos)} kg</strong> to <strong>{place?.name}</strong>.</p>
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => setStep("edit")} className="rounded-full border border-line px-4 py-2 font-semibold">Go back</button>
                <button type="button" disabled={pending} onClick={record} className="rounded-full bg-forest px-4 py-2 font-semibold text-on-brand disabled:opacity-60">
                  {pending ? "Recording…" : "Record weight"}
                </button>
              </div>
            </div>
          ) : (
            <form
              className="mt-4 grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                onError("");
                if (!/^\d+(\.\d{1,2})?$/.test(kilos) || Number(kilos) < 0.01 || Number(kilos) > 5000) {
                  onError("Enter the scale reading from 0.01 to 5,000 kg, with at most 2 decimal places.");
                  return;
                }
                setStep("confirm");
              }}
            >
              <label className="text-sm font-medium md:col-span-2" htmlFor="log-place">
                {competition.participantNoun}
                <select id="log-place" value={unitId} onChange={(event) => setUnitId(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-3">
                  {standings.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium md:col-span-2" htmlFor="log-kilos">
                Kilograms
                <input id="log-kilos" inputMode="decimal" value={kilos} onChange={(event) => setKilos(event.target.value)} placeholder="0.00" className="mt-1 w-full rounded-2xl border border-line bg-card px-4 py-4 text-3xl" />
              </label>
              <button className="w-fit rounded-full bg-forest px-5 py-3 font-semibold text-on-brand">Review weigh-in</button>
            </form>
          )}
          {room.recent.length ? (
            <ul className="mt-6 divide-y divide-line text-sm">
              {room.recent.slice(0, 6).map((entry) => (
                <li key={entry.id} className="flex justify-between gap-3 py-2">
                  <span>{kg(entry.kilos)} kg · {entry.unitName}</span>
                  <span className="text-muted">{formatWhen(entry.createdAt)}{entry.recorderName ? ` · ${entry.recorderName}` : ""}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <ForecastChart forecasts={room.forecasts || []} locked={competition.locked} noun={competition.participantNoun} />

      {access.enroll && room.enrollable.length ? (
        <form onSubmit={enroll} className="rounded-3xl border border-line bg-card p-6">
          <h2 className="text-xl font-semibold">Enroll a viewer</h2>
          <p className="mt-1 text-sm text-muted">They will see this competition only, the same way a class appears on a course list.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <select aria-label="Viewer to enroll" value={viewerId} onChange={(event) => setViewerId(event.target.value)} className="rounded-2xl border border-line bg-card px-4 py-3">
              {room.enrollable.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
            <button disabled={pending} className="rounded-full bg-forest px-4 py-3 text-sm font-semibold text-on-brand disabled:opacity-60">Enroll</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function ForecastChart({ forecasts, locked, noun }) {
  const [selectedId, setSelectedId] = useState(forecasts[0]?.id || "");
  const selected = forecasts.find((item) => item.id === selectedId) || forecasts[0];
  if (!selected) return null;
  const forecast = selected.forecast;

  return (
    <section className="rounded-3xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold">{locked ? "Trend at lock" : "Forecast"}</h2>
        <label className="text-sm font-medium">
          {noun}
          <select aria-label={`Forecast for a ${noun.toLowerCase()}`} value={selected.id} onChange={(event) => setSelectedId(event.target.value)} className="ml-2 rounded-2xl border border-line bg-card px-3 py-2">
            {forecasts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </div>
      {forecast.status !== "ok" ? (
        <p className="mt-4 text-sm text-muted">The line for {selected.name} needs four completed weeks. It has {forecast.have}.</p>
      ) : <DepartmentChart forecast={forecast} name={selected.name} />}
    </section>
  );
}

function DepartmentChart({ forecast, name }) {
  const actual = forecast.historyTail;
  const projection = forecast.projection;
  const width = 680;
  const height = 280;
  const pad = { left: 44, right: 16, top: 18, bottom: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const count = actual.length + projection.length;
  const max = Math.max(...actual.map((point) => point.kilos), ...projection.map((point) => point.kilos), 1);
  const xAt = (index) => pad.left + (index / Math.max(count - 1, 1)) * innerW;
  const yAt = (value) => pad.top + (1 - value / max) * innerH;
  const actualPath = actual.map((point, index) => `${index ? "L" : "M"} ${xAt(index)} ${yAt(point.kilos)}`).join(" ");
  const last = actual.length - 1;
  const forecastPath = [`M ${xAt(last)} ${yAt(actual[last].kilos)}`, ...projection.map((point, index) => `L ${xAt(last + 1 + index)} ${yAt(point.kilos)}`)].join(" ");

  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full" role="img" aria-label={`Actual and forecast kilograms for ${name}`}>
        {[0, 0.5, 1].map((step) => (
          <line key={step} x1={pad.left} x2={width - pad.right} y1={yAt(max * step)} y2={yAt(max * step)} stroke="var(--line)" />
        ))}
        <path d={actualPath} fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="chart-line" />
        <path d={forecastPath} fill="none" stroke="var(--accent)" strokeWidth="3" strokeDasharray="7 6" strokeLinejoin="round" strokeLinecap="round" className="chart-line-forecast" />
        {actual.map((point, index) => (
          <circle key={point.weekStart} cx={xAt(index)} cy={yAt(point.kilos)} r="3.5" fill="var(--ink)" />
        ))}
        <text x={pad.left} y={height - 8} fill="var(--muted)" fontSize="12">{actual[0].weekStart}</text>
        <text x={width - pad.right} y={height - 8} fill="var(--muted)" fontSize="12" textAnchor="end">{projection[projection.length - 1].weekStart}</text>
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-8 bg-ink" /> Actual · {name}</span>
        <span className="inline-flex items-center gap-2 text-accent"><span className="h-0.5 w-8 border-t-2 border-dashed border-accent" /> Forecast</span>
      </div>
      <p className="mt-3 text-sm text-muted">
        If this pace holds, {name} would collect about {kg(forecast.nextEightKilos)} kg over the next eight weeks. The line uses only the weigh-ins recorded for {name}.
      </p>
    </>
  );
}
