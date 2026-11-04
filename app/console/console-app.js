"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
    return <main className="grid min-h-screen place-items-center bg-paper text-ink/70">{error || "Opening your competitions…"}</main>;
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-card/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight">PlastiCycle</Link>
            <p className="text-sm text-ink/60">
              {list.user.organizationName || "Platform"} · {list.user.name}
            </p>
          </div>
          <button type="button" onClick={signOut} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
            Sign out
          </button>
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
          <p className="mt-2 max-w-xl text-ink/70">
            Each contest stays with the people enrolled in it. A barangay ranks puroks. A campus or company ranks departments.
          </p>
        </div>
        {list.canAdd ? (
          <button type="button" onClick={onAdd} className="rounded-full bg-forest px-5 py-3 font-semibold text-white">
            Add competition
          </button>
        ) : null}
      </div>
      {list.competitions.length === 0 ? (
        <p className="rise mt-8 rounded-3xl border border-line bg-card p-6 text-ink/70">
          Nothing is on your list yet. An administrator enrolls viewers into one competition at a time.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {list.competitions.map((competition, index) => (
            <li key={competition.id} className="rise" style={{ animationDelay: `${index * 70}ms` }}>
              <button type="button" onClick={() => onOpen(competition.id)} className="w-full rounded-3xl border border-line bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-forest">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-card">{competition.kindLabel}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${competition.locked ? "bg-clay/15 text-clay" : "bg-forest/10 text-forest"}`}>
                    {competition.locked ? "Locked" : "Open"}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">{competition.name}</h2>
                <p className="mt-1 text-sm text-ink/60">{prettyDate(competition.startsOn)} to {prettyDate(competition.endsOn)} · {competition.participantCount} {competition.participantsLabel.toLowerCase()}</p>
                <p className="mt-4 text-lg font-semibold">{kg(competition.totalKilos)} kg</p>
                <p className="text-sm text-ink/60">{competition.leaderName ? `Leading: ${competition.leaderName}` : "No weigh-ins yet"}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
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
      <p className="mt-2 text-ink/70">The type decides the words on the board, so a barangay contest never mixes with campus departments.</p>
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
            <span className="mt-1 block text-sm text-ink/65">{text}</span>
          </label>
        ))}
      </fieldset>
      <label className="mt-5 block text-sm font-medium" htmlFor="comp-name">
        Name
        <input id="comp-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3" required />
      </label>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium" htmlFor="comp-start">
          Starts
          <input id="comp-start" type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3" required />
        </label>
        <label className="text-sm font-medium" htmlFor="comp-end">
          Ends
          <input id="comp-end" type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3" required />
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium" htmlFor="comp-people">
        {noun[0].toUpperCase() + noun.slice(1)}, one per line
        <textarea id="comp-people" value={participants} onChange={(event) => setParticipants(event.target.value)} rows={5} placeholder={kind === "barangay" ? "Purok 1\nPurok 4" : "College of Engineering\nCollege of Business"} className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3" required />
      </label>
      <button disabled={pending} className="mt-5 rounded-full bg-ink px-5 py-3 font-semibold text-card disabled:opacity-60">
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
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-clay">{competition.kindLabel}</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">{competition.name}</h1>
          <p className="mt-2 text-ink/65">{prettyDate(competition.startsOn)} to {prettyDate(competition.endsOn)}</p>
        </div>
        {access.lock ? (
          <button type="button" onClick={() => setLocking(true)} className="rounded-full border border-clay px-4 py-2 text-sm font-semibold text-clay">
            Lock competition
          </button>
        ) : null}
      </div>

      {competition.locked ? (
        <p className="rounded-3xl bg-ink px-5 py-4 text-card">This competition is locked. Weigh-ins are closed, and this is the final ranking.</p>
      ) : null}

      {locking ? (
        <div className="rounded-3xl border border-clay/40 bg-card p-5">
          <p className="font-semibold">Lock this ranking?</p>
          <p className="mt-1 text-sm text-ink/70">No one can add kilograms after this. The standings stay as they are.</p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setLocking(false)} className="rounded-full border border-line px-4 py-2 text-sm font-semibold">Cancel</button>
            <button type="button" disabled={pending} onClick={lock} className="rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Lock it</button>
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="text-xl font-semibold">{competition.locked ? "Final standings" : "Standings"}</h2>
        <ol className="mt-5 space-y-4">
          {standings.map((row, index) => (
            <li key={row.id} className="rise" style={{ animationDelay: `${index * 60}ms` }}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="font-semibold">{row.rank}. {row.name}</span>
                <span>{kg(row.kilos)} kg</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div className="h-2 rounded-full bg-forest transition-all duration-700" style={{ width: `${max ? Math.max(row.kilos ? 6 : 0, (row.kilos / max) * 100) : 0}%` }} />
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
                <button type="button" disabled={pending} onClick={record} className="rounded-full bg-forest px-4 py-2 font-semibold text-white disabled:opacity-60">
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
                <select id="log-place" value={unitId} onChange={(event) => setUnitId(event.target.value)} className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3">
                  {standings.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium md:col-span-2" htmlFor="log-kilos">
                Kilograms
                <input id="log-kilos" inputMode="decimal" value={kilos} onChange={(event) => setKilos(event.target.value)} placeholder="0.00" className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-4 text-3xl" />
              </label>
              <button className="w-fit rounded-full bg-ink px-5 py-3 font-semibold text-card">Review weigh-in</button>
            </form>
          )}
          {room.recent.length ? (
            <ul className="mt-6 divide-y divide-line text-sm">
              {room.recent.slice(0, 6).map((entry) => (
                <li key={entry.id} className="flex justify-between gap-3 py-2">
                  <span>{kg(entry.kilos)} kg · {entry.unitName}</span>
                  <span className="text-ink/55">{formatWhen(entry.createdAt)}{entry.recorderName ? ` · ${entry.recorderName}` : ""}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <ForecastChart forecast={room.forecast} locked={competition.locked} />

      {access.enroll && room.enrollable.length ? (
        <form onSubmit={enroll} className="rounded-3xl border border-line bg-card p-6">
          <h2 className="text-xl font-semibold">Enroll a viewer</h2>
          <p className="mt-1 text-sm text-ink/65">They will see this competition only, the same way a class appears on a course list.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <select aria-label="Viewer to enroll" value={viewerId} onChange={(event) => setViewerId(event.target.value)} className="rounded-2xl border border-line bg-white px-4 py-3">
              {room.enrollable.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
            <button disabled={pending} className="rounded-full bg-ink px-4 py-3 text-sm font-semibold text-card disabled:opacity-60">Enroll</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function ForecastChart({ forecast, locked }) {
  if (!forecast) return null;
  if (forecast.status !== "ok") {
    return (
      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="text-xl font-semibold">Forecast</h2>
        <p className="mt-2 text-sm text-ink/70">The line needs four weeks of weigh-ins. This contest has {forecast.have}.</p>
      </section>
    );
  }

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
    <section className="rounded-3xl border border-line bg-card p-6">
      <h2 className="text-xl font-semibold">{locked ? "Trend at lock" : "Forecast"}</h2>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full" role="img" aria-label="Actual kilograms and the forecast line">
        {[0, 0.5, 1].map((step) => (
          <line key={step} x1={pad.left} x2={width - pad.right} y1={yAt(max * step)} y2={yAt(max * step)} stroke="#e4ddd0" />
        ))}
        <path d={actualPath} fill="none" stroke="#1c1917" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="chart-line" />
        <path d={forecastPath} fill="none" stroke="#1f6b4a" strokeWidth="3" strokeDasharray="7 6" strokeLinejoin="round" strokeLinecap="round" className="chart-line-forecast" />
        {actual.map((point, index) => (
          <circle key={point.weekStart} cx={xAt(index)} cy={yAt(point.kilos)} r="3.5" fill="#1c1917" />
        ))}
        <text x={pad.left} y={height - 8} fill="#78716c" fontSize="12">{actual[0].weekStart}</text>
        <text x={width - pad.right} y={height - 8} fill="#78716c" fontSize="12" textAnchor="end">{projection[projection.length - 1].weekStart}</text>
      </svg>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-8 bg-ink" /> Actual</span>
        <span className="inline-flex items-center gap-2 text-forest"><span className="h-0.5 w-8 border-t-2 border-dashed border-forest" /> Forecast</span>
      </div>
      <p className="mt-3 text-sm text-ink/65">
        If this pace holds, about {kg(forecast.nextEightKilos)} kg would arrive over the next eight weeks. The line is a regression on this contest only, a planning aid rather than a promise.
      </p>
    </section>
  );
}
