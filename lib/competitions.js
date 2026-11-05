import { randomUUID } from "node:crypto";
import { fail } from "./errors.js";
import { forecastWeekly } from "./forecast.js";
import { can } from "./permissions.js";
import { cleanText, parseKilos, round2 } from "./security.js";
import { addDays, isIsoDate, manilaDateFromIso, manilaNoonIso, manilaToday, nowIso, weekStartMonday } from "./time.js";

const KINDS = ["barangay", "campus", "company"];

export function participantNoun(kind, plural = false) {
  if (kind === "barangay") return plural ? "Puroks" : "Purok";
  return plural ? "Departments" : "Department";
}

export function kindTitle(kind) {
  return { barangay: "Barangay", campus: "Campus", company: "Company" }[kind] || kind;
}

function unitKindFor(kind) {
  return kind === "barangay" ? "purok" : "department";
}

export function migrateCompetitions(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('barangay', 'campus', 'company')),
      starts_on TEXT NOT NULL,
      ends_on TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open', 'locked')),
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS competition_participants (
      competition_id TEXT NOT NULL REFERENCES competitions(id),
      unit_id TEXT NOT NULL REFERENCES units(id),
      PRIMARY KEY (competition_id, unit_id)
    );

    CREATE TABLE IF NOT EXISTS competition_access (
      competition_id TEXT NOT NULL REFERENCES competitions(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      PRIMARY KEY (competition_id, user_id)
    );
  `);
}

function withTransaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* already closed */
    }
    throw error;
  }
}

function audit(db, { actor, organizationId, action, summary, ipHash }) {
  db.prepare(
    `INSERT INTO audit_log (id, actor_id, organization_id, action, summary, ip_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), actor?.id || null, organizationId || null, action, summary.slice(0, 240), ipHash || null, nowIso());
}

export function isLocked(competition) {
  return competition.status === "locked" || manilaToday() > competition.ends_on;
}

function assertVisible(db, actor, competition) {
  if (!competition) fail(404, "That competition is not on your list.");
  if (actor.joinStatus && actor.joinStatus !== "active") fail(403, "An admin still needs to confirm this account.");
  if (actor.role === "platform_admin") return;
  if (actor.role === "viewer") {
    if (!actor.organizationId || competition.organization_id !== actor.organizationId) {
      fail(404, "That competition is not on your list.");
    }
    return;
  }
  if (competition.organization_id !== actor.organizationId) {
    fail(404, "That competition is not on your list.");
  }
}

function rankRows(rows) {
  return rows.reduce((ranked, row, index) => {
    const previous = ranked[ranked.length - 1];
    const rank = !previous || row.kilos < previous.kilos ? index + 1 : previous.rank;
    ranked.push({ ...row, rank });
    return ranked;
  }, []);
}

function mapCompetition(row) {
  const locked = isLocked(row);
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    kindLabel: kindTitle(row.kind),
    participantNoun: participantNoun(row.kind),
    participantsLabel: participantNoun(row.kind, true),
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: locked ? "locked" : "open",
    locked,
    hostName: row.host_name,
    organizationId: row.organization_id,
  };
}

const COMPETITION_SELECT = `
  SELECT c.id, c.organization_id, c.name, c.kind, c.starts_on, c.ends_on, c.status, c.created_at,
         o.name AS host_name
  FROM competitions c
  JOIN organizations o ON o.id = c.organization_id
`;

export function listCompetitions(db, actor) {
  let rows;
  if (actor.joinStatus && actor.joinStatus !== "active") {
    rows = [];
  } else if (actor.role === "platform_admin") {
    rows = db.prepare(`${COMPETITION_SELECT} ORDER BY c.starts_on DESC, c.name COLLATE NOCASE`).all();
  } else if (actor.organizationId) {
    rows = db.prepare(
      `${COMPETITION_SELECT} WHERE c.organization_id = ? ORDER BY c.starts_on DESC, c.name COLLATE NOCASE`,
    ).all(actor.organizationId);
  } else {
    rows = [];
  }

  return rows.map((row) => {
    const competition = mapCompetition(row);
    const totals = db.prepare(
      `SELECT ROUND(COALESCE(SUM(kilos), 0), 2) AS kilos
       FROM collections WHERE season_id = ? AND voided = 0`,
    ).get(row.id);
    const leader = standings(db, row.id)[0];
    const count = db.prepare(
      "SELECT COUNT(*) AS count FROM competition_participants WHERE competition_id = ?",
    ).get(row.id);
    return {
      ...competition,
      totalKilos: round2(totals.kilos),
      leaderName: leader?.kilos > 0 ? leader.name : null,
      participantCount: count.count,
    };
  });
}

function loadCompetition(db, id) {
  return db.prepare(`${COMPETITION_SELECT} WHERE c.id = ?`).get(id);
}

export function standings(db, competitionId) {
  const rows = db.prepare(
    `SELECT u.id AS unit_id, u.name,
            ROUND(COALESCE(SUM(CASE WHEN col.voided = 0 THEN col.kilos END), 0), 2) AS kilos
     FROM competition_participants cp
     JOIN units u ON u.id = cp.unit_id
     LEFT JOIN collections col ON col.unit_id = u.id AND col.season_id = cp.competition_id
     WHERE cp.competition_id = ?
     GROUP BY u.id
     ORDER BY kilos DESC, u.name COLLATE NOCASE ASC`,
  ).all(competitionId);
  return rankRows(rows.map((row) => ({
    id: row.unit_id,
    name: row.name,
    kilos: round2(row.kilos),
  })));
}

function weeklySeries(db, competition, unitId) {
  const rows = db.prepare(
    "SELECT created_at, kilos FROM collections WHERE season_id = ? AND unit_id = ? AND voided = 0",
  ).all(competition.id, unitId);
  const totals = new Map();
  let first = null;
  let last = null;
  for (const row of rows) {
    const day = manilaDateFromIso(row.created_at);
    if (day < competition.starts_on || day > competition.ends_on) continue;
    const week = weekStartMonday(day);
    totals.set(week, (totals.get(week) || 0) + row.kilos);
    if (!first || week < first) first = week;
    if (!last || week > last) last = week;
  }
  if (!first) return [];
  const today = manilaToday();
  const currentWeek = weekStartMonday(today);
  let finalWeek = last;
  if (competition.ends_on >= today && finalWeek >= currentWeek) {
    finalWeek = addDays(currentWeek, -7);
  }
  if (first > finalWeek) return [];
  const buckets = [];
  for (let cursor = first; cursor <= finalWeek; cursor = addDays(cursor, 7)) {
    buckets.push({ weekStart: cursor, kilos: round2(totals.get(cursor) || 0) });
  }
  return buckets;
}

export function competitionRoom(db, actor, competitionId) {
  const row = loadCompetition(db, competitionId);
  assertVisible(db, actor, row);
  const competition = mapCompetition(row);
  const board = standings(db, row.id);
  const showPeople = can(actor.role, "ledger:read");
  const recent = db.prepare(
    `SELECT col.id, col.kilos, col.created_at, col.voided, u.name AS unit_name, usr.name AS recorder_name, usr.id AS recorder_id
     FROM collections col
     JOIN units u ON u.id = col.unit_id
     JOIN users usr ON usr.id = col.recorded_by
     WHERE col.season_id = ? AND (? = 0 OR col.recorded_by = ?)
     ORDER BY col.created_at DESC
     LIMIT 12`,
  ).all(row.id, actor.role === "middleman" ? 1 : 0, actor.id).map((entry) => ({
    id: entry.id,
    kilos: round2(entry.kilos),
    unitName: entry.unit_name,
    createdAt: entry.created_at,
    voided: Boolean(entry.voided),
    recorderName: showPeople || entry.recorder_id === actor.id ? entry.recorder_name : null,
  }));

  const enrollable = actor.role === "org_admin" || actor.role === "platform_admin"
    ? db.prepare(
      `SELECT u.id, u.name, u.email
       FROM users u
       WHERE u.organization_id = ? AND u.role = 'viewer' AND u.active = 1
         AND NOT EXISTS (
           SELECT 1 FROM competition_access a WHERE a.competition_id = ? AND a.user_id = u.id
         )
       ORDER BY u.name COLLATE NOCASE`,
    ).all(row.organization_id, row.id)
    : [];

  return {
    competition,
    standings: board,
    forecasts: can(actor.role, "forecast:read")
      ? board.map((participant) => ({
        id: participant.id,
        name: participant.name,
        forecast: forecastWeekly(weeklySeries(db, row, participant.id)),
      }))
      : [],
    recent: actor.role === "viewer" ? [] : recent,
    enrollable,
    access: {
      log: can(actor.role, "collection:create") && !competition.locked,
      lock: (actor.role === "org_admin" || actor.role === "platform_admin") && row.status === "open" && manilaToday() <= row.ends_on,
      enroll: actor.role === "org_admin" || actor.role === "platform_admin",
    },
  };
}

export function createCompetition(db, actor, input, ipHash) {
  if (actor.role !== "org_admin" && actor.role !== "platform_admin") {
    fail(403, "Only an administrator can add a competition.");
  }
  const organizationId = actor.role === "platform_admin" ? input?.organizationId : actor.organizationId;
  const org = db.prepare("SELECT id, name FROM organizations WHERE id = ?").get(organizationId);
  if (!org) fail(400, "Choose the organization that hosts this competition.");
  const name = cleanText(input?.name, { min: 3, max: 80 });
  if (!name) fail(400, "Enter a competition name between 3 and 80 characters.");
  if (!KINDS.includes(input?.kind)) fail(400, "Choose a barangay, campus, or company competition.");
  if (!isIsoDate(input?.startsOn) || !isIsoDate(input?.endsOn) || input.startsOn > input.endsOn) {
    fail(400, "Enter a start date and an end date, with the end on or after the start.");
  }
  const names = [...new Set(
    (Array.isArray(input?.participants) ? input.participants : String(input?.participants || "").split("\n"))
      .map((item) => cleanText(item, { min: 2, max: 80 }))
      .filter(Boolean),
  )];
  if (names.length < 2) {
    fail(400, `Add at least two ${participantNoun(input.kind, true).toLowerCase()}.`);
  }
  if (names.length > 24) fail(400, "A competition can include up to 24 participants.");

  const id = randomUUID();
  const unitKind = unitKindFor(input.kind);
  withTransaction(db, () => {
    db.prepare(
      `INSERT INTO seasons (id, name, starts_on, ends_on, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)`,
    ).run(id, name, input.startsOn, input.endsOn, nowIso());
    db.prepare(
      "INSERT INTO season_members (season_id, organization_id, joined_at) VALUES (?, ?, ?)",
    ).run(id, org.id, nowIso());
    db.prepare(
      `INSERT INTO competitions (
        id, organization_id, name, kind, starts_on, ends_on, status, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
    ).run(id, org.id, name, input.kind, input.startsOn, input.endsOn, actor.id, nowIso());
    const findUnit = db.prepare("SELECT id, kind FROM units WHERE organization_id = ? AND name = ?");
    const insertUnit = db.prepare(
      "INSERT INTO units (id, organization_id, name, kind, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    const link = db.prepare(
      "INSERT INTO competition_participants (competition_id, unit_id) VALUES (?, ?)",
    );
    for (const participantName of names) {
      const existing = findUnit.get(org.id, participantName);
      if (existing && existing.kind !== unitKind) {
        fail(409, `${participantName} is already used for a different kind of place.`);
      }
      const unitId = existing?.id || randomUUID();
      if (!existing) insertUnit.run(unitId, org.id, participantName, unitKind, nowIso());
      link.run(id, unitId);
    }
    db.prepare(
      "INSERT INTO competition_access (competition_id, user_id) VALUES (?, ?)",
    ).run(id, actor.id);
    audit(db, {
      actor,
      organizationId: org.id,
      action: "competition_created",
      summary: `${actor.name} opened ${name}.`,
      ipHash,
    });
  });
  return { id, name, kind: input.kind };
}

export function lockCompetition(db, actor, competitionId, ipHash) {
  if (actor.role !== "org_admin" && actor.role !== "platform_admin") {
    fail(403, "Only an administrator can lock a competition.");
  }
  const row = loadCompetition(db, competitionId);
  assertVisible(db, actor, row);
  if (row.status === "locked") fail(400, "This competition is already locked.");
  withTransaction(db, () => {
    db.prepare("UPDATE competitions SET status = 'locked' WHERE id = ?").run(row.id);
    db.prepare("UPDATE seasons SET status = 'closed' WHERE id = ?").run(row.id);
    audit(db, {
      actor,
      organizationId: row.organization_id,
      action: "competition_locked",
      summary: `${actor.name} locked ${row.name}. Final standings are now fixed.`,
      ipHash,
    });
  });
}

export function enrollViewer(db, actor, competitionId, input, ipHash) {
  if (actor.role !== "org_admin" && actor.role !== "platform_admin") {
    fail(403, "Only an administrator can enroll someone.");
  }
  const row = loadCompetition(db, competitionId);
  assertVisible(db, actor, row);
  const user = db.prepare(
    "SELECT id, name, role, organization_id, active FROM users WHERE id = ?",
  ).get(input?.userId);
  if (!user || !user.active || user.role !== "viewer" || user.organization_id !== row.organization_id) {
    fail(400, "Choose a viewer from this organization.");
  }
  db.prepare(
    `INSERT INTO competition_access (competition_id, user_id) VALUES (?, ?)
     ON CONFLICT(competition_id, user_id) DO NOTHING`,
  ).run(row.id, user.id);
  audit(db, {
    actor,
    organizationId: row.organization_id,
    action: "competition_enrolled",
    summary: `${actor.name} enrolled ${user.name} in ${row.name}.`,
    ipHash,
  });
}

export function recordCompetitionWeighIn(db, actor, input, ipHash) {
  if (!can(actor.role, "collection:create")) fail(403, "You do not have permission to record a weigh-in.");
  const row = loadCompetition(db, input.competitionId);
  assertVisible(db, actor, row);
  if (isLocked(row)) fail(400, "This competition is locked. Only the final standings remain.");
  if (manilaToday() < row.starts_on) fail(400, "This competition has not started.");
  const kilosResult = parseKilos(input?.kilos);
  if (kilosResult.error) fail(400, kilosResult.error);
  const bounds = db.prepare("SELECT min_kilos, max_kilos FROM organizations WHERE id = ?").get(row.organization_id);
  const minKilos = Number(bounds?.min_kilos ?? 0.01);
  const maxKilos = Number(bounds?.max_kilos ?? 5000);
  if (kilosResult.kilos < minKilos || kilosResult.kilos > maxKilos) {
    fail(400, `This organization accepts ${minKilos} to ${maxKilos} kg on each weigh-in.`);
  }
  if (typeof input?.unitId !== "string" || !input.unitId) {
    fail(400, `Choose the ${participantNoun(row.kind).toLowerCase()} that brought the plastic.`);
  }
  const participant = db.prepare(
    `SELECT u.id, u.name
     FROM competition_participants cp
     JOIN units u ON u.id = cp.unit_id
     WHERE cp.competition_id = ? AND cp.unit_id = ?`,
  ).get(row.id, input?.unitId);
  if (!participant) fail(403, `That ${participantNoun(row.kind).toLowerCase()} is not in this competition.`);

  let clientRequestId = null;
  if (input?.clientRequestId) {
    clientRequestId = String(input.clientRequestId).toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(clientRequestId)) {
      fail(400, "The weigh-in could not be confirmed. Submit it once from the form.");
    }
  }

  return withTransaction(db, () => {
    if (clientRequestId) {
      const existing = db.prepare(
        `SELECT c.id, c.kilos, c.created_at, u.name AS unit_name
         FROM collections c JOIN units u ON u.id = c.unit_id
         WHERE c.recorded_by = ? AND c.client_request_id = ?`,
      ).get(actor.id, clientRequestId);
      if (existing) {
        return { id: existing.id, kilos: existing.kilos, unitName: existing.unit_name, createdAt: existing.created_at, duplicate: true };
      }
    }
    const id = randomUUID();
    const createdAt = nowIso();
    db.prepare(
      `INSERT INTO collections (
        id, organization_id, unit_id, season_id, recorded_by, kilos, note, client_request_id, voided, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 0, ?)`,
    ).run(id, row.organization_id, participant.id, row.id, actor.id, kilosResult.kilos, clientRequestId, createdAt);
    audit(db, {
      actor,
      organizationId: row.organization_id,
      action: "collection_recorded",
      summary: `${actor.name} recorded ${kilosResult.kilos} kg for ${participant.name}.`,
      ipHash,
    });
    return { id, kilos: kilosResult.kilos, unitName: participant.name, createdAt, duplicate: false };
  });
}

export function ensureSampleCompetitions(db) {
  const organizations = db.prepare("SELECT COUNT(*) AS count FROM organizations").get().count;
  const competitions = db.prepare("SELECT COUNT(*) AS count FROM competitions").get().count;
  if (!organizations || competitions > 0) return;

  const stamp = "2026-01-01T00:00:00.000Z";
  const insertCompetition = (id, organizationId, name, kind, starts, ends, status) => {
    db.prepare(
      `INSERT INTO seasons (id, name, starts_on, ends_on, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, name, starts, ends, status === "locked" ? "closed" : "active", stamp);
    db.prepare(
      "INSERT INTO season_members (season_id, organization_id, joined_at) VALUES (?, ?, ?)",
    ).run(id, organizationId, stamp);
    db.prepare(
      `INSERT INTO competitions (
        id, organization_id, name, kind, starts_on, ends_on, status, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    ).run(id, organizationId, name, kind, starts, ends, status, stamp);
  };
  const linkUnits = (competitionId, unitIds) => {
    const link = db.prepare("INSERT INTO competition_participants (competition_id, unit_id) VALUES (?, ?)");
    for (const unitId of unitIds) link.run(competitionId, unitId);
  };

  insertCompetition("comp_sa_2026", "org_san_antonio", "2026 Purok Plastic Drive", "barangay", "2026-01-01", "2026-12-31", "open");
  linkUnits("comp_sa_2026", ["unit_sa_p1", "unit_sa_p4"]);
  insertCompetition("comp_sa_2025", "org_san_antonio", "2025 Purok Finals", "barangay", "2025-01-01", "2025-12-31", "locked");
  linkUnits("comp_sa_2025", ["unit_sa_p1", "unit_sa_p4"]);
  insertCompetition("comp_mmcm_2026", "org_mmcm", "2026 Campus Plastic Cup", "campus", "2026-01-01", "2026-12-31", "open");
  linkUnits("comp_mmcm_2026", ["unit_mm_eng", "unit_mm_bus", "unit_mm_shs", "unit_mm_cas"]);

  db.prepare("INSERT INTO competition_access (competition_id, user_id) VALUES (?, ?)").run("comp_sa_2026", "user_antonio_admin");
  db.prepare("INSERT INTO competition_access (competition_id, user_id) VALUES (?, ?)").run("comp_sa_2026", "user_antonio_weigh");
  db.prepare("INSERT INTO competition_access (competition_id, user_id) VALUES (?, ?)").run("comp_mmcm_2026", "user_mmcm_admin");
  db.prepare("INSERT INTO competition_access (competition_id, user_id) VALUES (?, ?)").run("comp_mmcm_2026", "user_mmcm_weigh");
  db.prepare("INSERT INTO competition_access (competition_id, user_id) VALUES (?, ?)").run("comp_mmcm_2026", "user_mmcm_view");

  const insertLog = db.prepare(
    `INSERT INTO collections (
      id, organization_id, unit_id, season_id, recorded_by, kilos, note, client_request_id, voided, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 0, ?)`,
  );
  const weeks = ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"];
  const saUnits = ["unit_sa_p1", "unit_sa_p4"];
  const mmUnits = ["unit_mm_eng", "unit_mm_bus", "unit_mm_shs", "unit_mm_cas"];
  weeks.forEach((week, index) => {
    insertLog.run(`sample_sa_${week}`, "org_san_antonio", saUnits[index % 2], "comp_sa_2026", "user_antonio_weigh", 40 + index * 3, manilaNoonIso(week));
    insertLog.run(`sample_mm_${week}`, "org_mmcm", mmUnits[index % 4], "comp_mmcm_2026", "user_mmcm_weigh", 55 + index * 2, manilaNoonIso(week));
  });
  insertLog.run("sample_sa_2025_a", "org_san_antonio", "unit_sa_p1", "comp_sa_2025", "user_antonio_weigh", 120, "2025-11-01T04:00:00.000Z");
  insertLog.run("sample_sa_2025_b", "org_san_antonio", "unit_sa_p4", "comp_sa_2025", "user_antonio_weigh", 98, "2025-11-08T04:00:00.000Z");
}
