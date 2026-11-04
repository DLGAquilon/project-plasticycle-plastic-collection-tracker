import { forecastWeekly } from "./forecast.js";
import { can, UNIT_KINDS } from "./permissions.js";
import { round2 } from "./security.js";
import { manilaDateFromIso, manilaToday, weekStartMonday, addDays } from "./time.js";
import { publicActor, seasonStandings, unitStandings } from "./actions.js";

function defaultSeasonId(db, actor) {
  const today = manilaToday();
  const enrolled = actor.organizationId
    ? db.prepare(
      `SELECT s.id FROM seasons s
       JOIN season_members sm ON sm.season_id = s.id
       WHERE sm.organization_id = ? AND s.status = 'active' AND s.starts_on <= ? AND s.ends_on >= ?
       ORDER BY s.starts_on DESC LIMIT 1`,
    ).get(actor.organizationId, today, today)
    : null;
  if (enrolled) return enrolled.id;
  const active = db.prepare(
    `SELECT id FROM seasons
     WHERE status = 'active' AND starts_on <= ? AND ends_on >= ?
     ORDER BY starts_on DESC LIMIT 1`,
  ).get(today, today);
  return active?.id || db.prepare("SELECT id FROM seasons ORDER BY starts_on DESC LIMIT 1").get()?.id || null;
}

function listSeasons(db, actor) {
  const rows = db.prepare(
    "SELECT id, name, starts_on, ends_on, status FROM seasons ORDER BY starts_on DESC",
  ).all();
  const memberships = new Set(
    actor.organizationId
      ? db.prepare("SELECT season_id FROM season_members WHERE organization_id = ?").all(actor.organizationId).map((row) => row.season_id)
      : [],
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    status: row.status,
    enrolled: memberships.has(row.id),
  }));
}

export function weeklyTotals(db, organizationId, season) {
  const rows = db.prepare(
    `SELECT created_at, kilos FROM collections
     WHERE organization_id = ? AND season_id = ? AND voided = 0`,
  ).all(organizationId, season.id);
  const endCap = season.ends_on < manilaToday() ? season.ends_on : manilaToday();
  const buckets = new Map();
  for (let cursor = weekStartMonday(season.starts_on); cursor <= weekStartMonday(endCap); cursor = addDays(cursor, 7)) {
    buckets.set(cursor, 0);
  }
  for (const row of rows) {
    const day = manilaDateFromIso(row.created_at);
    if (day < season.starts_on || day > season.ends_on) continue;
    const week = weekStartMonday(day);
    buckets.set(week, (buckets.get(week) || 0) + row.kilos);
  }
  return [...buckets.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([weekStart, kilos]) => ({ weekStart, kilos: round2(kilos) }));
}

function orgTotals(db, organizationId, seasonId) {
  const seasonRow = db.prepare(
    `SELECT ROUND(COALESCE(SUM(kilos), 0), 2) AS kilos, COUNT(*) AS entries
     FROM collections WHERE organization_id = ? AND season_id = ? AND voided = 0`,
  ).get(organizationId, seasonId);
  const allTime = db.prepare(
    `SELECT ROUND(COALESCE(SUM(kilos), 0), 2) AS kilos
     FROM collections WHERE organization_id = ? AND voided = 0`,
  ).get(organizationId);
  return {
    seasonKilos: round2(seasonRow.kilos),
    allTimeKilos: round2(allTime.kilos),
    entryCount: seasonRow.entries,
  };
}

function shapeEntry(row, actor) {
  const fullLedger = can(actor.role, "ledger:read");
  const own = row.recorder_id === actor.id;
  return {
    id: row.id,
    kilos: round2(row.kilos),
    unitName: row.unit_name,
    note: fullLedger || own ? row.note : null,
    voided: Boolean(row.voided),
    voidReason: fullLedger ? row.void_reason : null,
    createdAt: row.created_at,
    recorderName: fullLedger || own ? row.recorder_name : null,
  };
}

export function buildWorkspace(db, actor, query = {}) {
  const seasonId = query.seasonId || defaultSeasonId(db, actor);
  const seasonRow = seasonId
    ? db.prepare("SELECT id, name, starts_on, ends_on, status FROM seasons WHERE id = ?").get(seasonId)
    : null;
  const season = seasonRow
    ? { id: seasonRow.id, name: seasonRow.name, startsOn: seasonRow.starts_on, endsOn: seasonRow.ends_on, status: seasonRow.status }
    : null;
  const standings = season ? seasonStandings(db, season.id) : [];
  const mine = standings.find((row) => row.organizationId === actor.organizationId) || null;
  const kindBoard = actor.organizationKind
    ? standings.filter((row) => row.kind === actor.organizationKind)
    : standings;
  const rankedKind = kindBoard.map((row) => ({ ...row }));
  // Recompute kind rank from the already sorted overall list, which is kilos desc.
  let lastKilos = null;
  let lastRank = 0;
  rankedKind.forEach((row, index) => {
    if (lastKilos === null || row.kilos < lastKilos) {
      lastRank = index + 1;
      lastKilos = row.kilos;
    }
    row.rank = lastRank;
  });

  const focusOrgId = actor.role === "platform_admin" ? query.orgId || null : actor.organizationId;
  const focusOrg = focusOrgId
    ? db.prepare("SELECT id, name, kind, slug FROM organizations WHERE id = ?").get(focusOrgId)
    : null;

  let units = [];
  let places = [];
  let totals = null;
  let recent = [];
  let forecast = null;
  if (focusOrg && season) {
    units = unitStandings(db, focusOrg.id, season.id);
    places = db.prepare(
      "SELECT id, name, kind FROM units WHERE organization_id = ? ORDER BY name COLLATE NOCASE",
    ).all(focusOrg.id).map((row) => ({ id: row.id, name: row.name, kind: row.kind }));
    totals = orgTotals(db, focusOrg.id, season.id);
    if (can(actor.role, "forecast:read")) {
      forecast = forecastWeekly(weeklyTotals(db, focusOrg.id, seasonRow));
    }
    if (actor.organizationId === focusOrg.id || actor.role === "platform_admin") {
      const ownOnly = !can(actor.role, "ledger:read") && !can(actor.role, "ledger:totals");
      const rows = db.prepare(
        `SELECT c.id, c.kilos, c.note, c.voided, c.void_reason, c.created_at,
                u.name AS unit_name, usr.name AS recorder_name, usr.id AS recorder_id
         FROM collections c
         JOIN units u ON u.id = c.unit_id
         JOIN users usr ON usr.id = c.recorded_by
         WHERE c.organization_id = ? AND (? = 0 OR c.recorded_by = ?)
         ORDER BY c.created_at DESC
         LIMIT 30`,
      ).all(focusOrg.id, ownOnly ? 1 : 0, actor.id);
      recent = rows
        .filter((row) => {
          if (can(actor.role, "ledger:read") || can(actor.role, "ledger:totals")) return true;
          if (can(actor.role, "ledger:own")) return row.recorder_id === actor.id;
          return false;
        })
        .map((row) => shapeEntry(row, actor));
    }
  }

  const people = can(actor.role, "people:read")
    ? db.prepare(
      `SELECT u.id, u.name, u.email, u.role, u.active, o.name AS organization_name
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
       WHERE (? IS NULL OR u.organization_id = ?) AND u.role != 'platform_admin'
       ORDER BY u.active DESC, u.name COLLATE NOCASE`,
    ).all(actor.role === "platform_admin" ? null : actor.organizationId, actor.role === "platform_admin" ? null : actor.organizationId)
      .map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        active: Boolean(row.active),
        organizationName: row.organization_name,
      }))
    : [];

  const auditRows = !can(actor.role, "audit:read")
    ? []
    : actor.role === "platform_admin"
      ? db.prepare(
        "SELECT id, action, summary, created_at FROM audit_log ORDER BY created_at DESC LIMIT 40",
      ).all()
      : db.prepare(
        "SELECT id, action, summary, created_at FROM audit_log WHERE organization_id = ? ORDER BY created_at DESC LIMIT 40",
      ).all(actor.organizationId);
  const audit = auditRows.map((row) => ({
    id: row.id,
    action: row.action,
    summary: row.summary,
    createdAt: row.created_at,
  }));

  const organizations = actor.role === "platform_admin"
    ? db.prepare("SELECT id, name, kind, slug FROM organizations ORDER BY name COLLATE NOCASE").all()
    : [];

  const kindRank = rankedKind.find((row) => row.organizationId === actor.organizationId) || null;

  return {
    user: publicActor(actor),
    organization: actor.organizationId
      ? {
        id: actor.organizationId,
        name: actor.organizationName,
        kind: actor.organizationKind,
        slug: actor.organizationSlug,
        unitKinds: UNIT_KINDS[actor.organizationKind] || [],
      }
      : null,
    focusOrganization: focusOrg
      ? { id: focusOrg.id, name: focusOrg.name, kind: focusOrg.kind, unitKinds: UNIT_KINDS[focusOrg.kind] || [] }
      : null,
    access: {
      weigh: can(actor.role, "collection:create"),
      void: can(actor.role, "collection:void"),
      managePeople: can(actor.role, "people:read"),
      manageUnits: can(actor.role, "unit:manage"),
      joinSeason: can(actor.role, "season:join"),
      platform: actor.role === "platform_admin",
      audit: can(actor.role, "audit:read"),
      forecast: can(actor.role, "forecast:read"),
    },
    season,
    seasons: listSeasons(db, actor),
    standings,
    kindStandings: rankedKind,
    rank: mine
      ? {
        position: mine.rank,
        of: standings.length,
        kilos: mine.kilos,
        kindPosition: kindRank?.rank || null,
        kindOf: rankedKind.length,
      }
      : null,
    units,
    places,
    totals,
    recent,
    forecast,
    people,
    audit,
    organizations,
  };
}

export function publicLeaderboard(db) {
  const today = manilaToday();
  const season = db.prepare(
    `SELECT id, name, starts_on, ends_on FROM seasons
     WHERE status = 'active' AND starts_on <= ? AND ends_on >= ?
     ORDER BY starts_on DESC LIMIT 1`,
  ).get(today, today);
  if (!season) return { season: null, standings: [] };
  return {
    season: { id: season.id, name: season.name, startsOn: season.starts_on, endsOn: season.ends_on },
    standings: seasonStandings(db, season.id).map((row) => ({
      rank: row.rank,
      name: row.name,
      kind: row.kind,
      kilos: row.kilos,
    })),
  };
}
