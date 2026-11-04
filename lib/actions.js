import { randomUUID } from "node:crypto";
import { recordCompetitionWeighIn } from "./competitions.js";
import { fail } from "./errors.js";
import { can, ORG_KINDS, UNIT_KINDS } from "./permissions.js";
import {
  cleanText,
  hashPassword,
  hashToken,
  newToken,
  normalizeEmail,
  parseKilos,
  round2,
  validateEmail,
  validatePassword,
  verifyPassword,
} from "./security.js";
import { isIsoDate, manilaToday, nowIso } from "./time.js";

const SESSION_MS = 12 * 60 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const GENERIC_LOGIN = "Invalid email or password.";
let dummyHash;

function timingPadHash() {
  if (!dummyHash) dummyHash = hashPassword("plasticycle-timing-pad");
  return dummyHash;
}

function actorFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: Boolean(row.active),
    organizationId: row.organization_id,
    organizationName: row.organization_name || null,
    organizationKind: row.organization_kind || null,
    organizationSlug: row.organization_slug || null,
  };
}

export function publicActor(actor) {
  return {
    id: actor.id,
    email: actor.email,
    name: actor.name,
    role: actor.role,
    organizationId: actor.organizationId,
    organizationName: actor.organizationName,
    organizationKind: actor.organizationKind,
  };
}

export function getUserBySession(db, token) {
  if (!token) return null;
  const row = db.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.active, u.organization_id,
            o.name AS organization_name, o.kind AS organization_kind, o.slug AS organization_slug
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
  ).get(hashToken(token), nowIso());
  return actorFromRow(row);
}

export function getActorByEmail(db, email) {
  const row = db.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.active, u.organization_id,
            o.name AS organization_name, o.kind AS organization_kind, o.slug AS organization_slug
     FROM users u
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE u.email = ?`,
  ).get(normalizeEmail(email));
  return actorFromRow(row);
}

function writeAudit(db, { actor, organizationId, action, summary, ipHash }) {
  db.prepare(
    `INSERT INTO audit_log (id, actor_id, organization_id, action, summary, ip_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), actor?.id || null, organizationId || null, action, summary.slice(0, 240), ipHash || null, nowIso());
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

export function loginUser(db, { email, password, ipHash }) {
  const normalized = validateEmail(email);
  if (!normalized || typeof password !== "string" || password.length > 128) fail(401, GENERIC_LOGIN);

  const attempt = db.prepare("SELECT failures, locked_until FROM login_attempts WHERE email = ?").get(normalized);
  if (attempt?.locked_until && attempt.locked_until > nowIso()) {
    fail(429, "Too many attempts. Try again in 15 minutes.");
  }

  const row = db.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.active, u.password_hash, u.organization_id,
            o.name AS organization_name, o.kind AS organization_kind, o.slug AS organization_slug
     FROM users u
     LEFT JOIN organizations o ON o.id = u.organization_id
     WHERE u.email = ?`,
  ).get(normalized);

  const passwordOk = verifyPassword(password, row?.password_hash || timingPadHash());
  const valid = Boolean(row?.active) && passwordOk;
  if (!valid) {
    const failures = (attempt?.failures || 0) + 1;
    const lockedUntil = failures >= 5 ? new Date(Date.now() + LOCK_MS).toISOString() : null;
    db.prepare(
      `INSERT INTO login_attempts (email, failures, locked_until) VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until`,
    ).run(normalized, failures, lockedUntil);
    writeAudit(db, {
      actor: row ? { id: row.id } : null,
      organizationId: row?.organization_id || null,
      action: "login_failure",
      summary: row ? `Failed sign-in for ${row.name}.` : "Failed sign-in for an unknown account.",
      ipHash,
    });
    fail(401, GENERIC_LOGIN);
  }

  db.prepare("DELETE FROM login_attempts WHERE email = ?").run(normalized);
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso());
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_MS).toISOString();
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
  ).run(hashToken(token), row.id, expiresAt, nowIso());
  const actor = actorFromRow(row);
  writeAudit(db, {
    actor,
    organizationId: actor.organizationId,
    action: "login_success",
    summary: `${actor.name} signed in.`,
    ipHash,
  });
  return { token, user: publicActor(actor) };
}

export function logoutUser(db, token) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function listPublicOrganizations(db) {
  return db.prepare(
    "SELECT id, name, kind FROM organizations ORDER BY name COLLATE NOCASE",
  ).all();
}

export function registerViewer(db, input, ipHash) {
  const name = cleanText(input?.name, { min: 2, max: 80 });
  if (!name) fail(400, "Enter your name, between 2 and 80 characters.");
  const email = validateEmail(input?.email);
  if (!email) fail(400, "Enter a valid email address.");
  const passwordError = validatePassword(input?.password);
  if (passwordError) fail(400, passwordError);
  const org = db.prepare("SELECT id, name FROM organizations WHERE id = ?").get(input?.organizationId);
  if (!org) fail(400, "Choose the barangay, campus, or organization you belong to.");
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) fail(409, "That email is already in use.");

  const id = randomUUID();
  withTransaction(db, () => {
    db.prepare(
      `INSERT INTO users (id, organization_id, email, name, password_hash, role, active, created_at)
       VALUES (?, ?, ?, ?, ?, 'viewer', 1, ?)`,
    ).run(id, org.id, email, name, hashPassword(input.password), nowIso());
    writeAudit(db, {
      actor: { id },
      organizationId: org.id,
      action: "viewer_registered",
      summary: `${name} created a viewer account for ${org.name}.`,
      ipHash,
    });
  });
  return loginUser(db, { email, password: input.password, ipHash });
}

function requirePermission(actor, action) {
  if (!actor?.active) fail(401, "Sign in required.");
  if (!can(actor.role, action)) fail(403, "You do not have permission to do that.");
}

function loadSeason(db, seasonId) {
  const season = db.prepare(
    "SELECT id, name, starts_on, ends_on, status FROM seasons WHERE id = ?",
  ).get(seasonId);
  if (!season) fail(404, "That season does not exist.");
  return season;
}

function assertSeasonOpenForOrg(db, season, organizationId) {
  const today = manilaToday();
  if (season.status !== "active" || today < season.starts_on || today > season.ends_on) {
    fail(400, "That season is not open for weigh-ins.");
  }
  const member = db.prepare(
    "SELECT 1 AS ok FROM season_members WHERE season_id = ? AND organization_id = ?",
  ).get(season.id, organizationId);
  if (!member) fail(403, "Your organization is not enrolled in that season.");
}

export function createCollection(db, actor, input, ipHash) {
  if (input?.competitionId) return recordCompetitionWeighIn(db, actor, input, ipHash);
  requirePermission(actor, "collection:create");
  if (!actor.organizationId) fail(403, "Weigh-ins belong to an organization.");

  const kilosResult = parseKilos(input?.kilos);
  if (kilosResult.error) fail(400, kilosResult.error);
  const season = loadSeason(db, input?.seasonId);
  assertSeasonOpenForOrg(db, season, actor.organizationId);

  const unit = db.prepare(
    "SELECT id, name, organization_id FROM units WHERE id = ?",
  ).get(input?.unitId);
  if (!unit || unit.organization_id !== actor.organizationId) {
    fail(403, "That village or department is not part of your organization.");
  }

  let note = null;
  if (input?.note) {
    note = cleanText(input.note, { min: 0, max: 140 });
    if (note === null) fail(400, "Keep the note under 140 characters.");
    if (!note) note = null;
  }

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
        return {
          id: existing.id,
          kilos: existing.kilos,
          unitName: existing.unit_name,
          createdAt: existing.created_at,
          duplicate: true,
        };
      }
    }

    const id = randomUUID();
    const createdAt = nowIso();
    db.prepare(
      `INSERT INTO collections (
        id, organization_id, unit_id, season_id, recorded_by, kilos, note, client_request_id, voided, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    ).run(id, actor.organizationId, unit.id, season.id, actor.id, kilosResult.kilos, note, clientRequestId, createdAt);
    writeAudit(db, {
      actor,
      organizationId: actor.organizationId,
      action: "collection_recorded",
      summary: `${actor.name} recorded ${kilosResult.kilos} kg for ${unit.name}.`,
      ipHash,
    });
    return { id, kilos: kilosResult.kilos, unitName: unit.name, createdAt, duplicate: false };
  });
}

export function voidCollection(db, actor, collectionId, input, ipHash) {
  requirePermission(actor, "collection:void");
  const reason = cleanText(input?.reason, { min: 5, max: 200 });
  if (!reason) fail(400, "Give a reason between 5 and 200 characters.");

  const row = db.prepare(
    `SELECT c.id, c.organization_id, c.voided, c.kilos, u.name AS unit_name
     FROM collections c JOIN units u ON u.id = c.unit_id WHERE c.id = ?`,
  ).get(collectionId);
  if (!row) fail(404, "That weigh-in does not exist.");
  if (actor.role !== "platform_admin" && row.organization_id !== actor.organizationId) {
    fail(403, "You can only void weigh-ins from your organization.");
  }
  if (row.voided) fail(400, "That weigh-in is already voided.");

  withTransaction(db, () => {
    db.prepare(
      "UPDATE collections SET voided = 1, void_reason = ?, voided_by = ?, voided_at = ? WHERE id = ? AND voided = 0",
    ).run(reason, actor.id, nowIso(), row.id);
    writeAudit(db, {
      actor,
      organizationId: row.organization_id,
      action: "collection_voided",
      summary: `${actor.name} voided ${row.kilos} kg for ${row.unit_name}. Reason: ${reason}`,
      ipHash,
    });
  });
}

function slugify(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return base || "organization";
}

export function createOrganization(db, actor, input, ipHash) {
  requirePermission(actor, "org:create");
  const name = cleanText(input?.name, { min: 3, max: 80 });
  if (!name) fail(400, "Enter an organization name between 3 and 80 characters.");
  if (!ORG_KINDS.includes(input?.kind)) fail(400, "Choose a barangay, campus, city, or institution.");

  let slug = slugify(name);
  const taken = db.prepare("SELECT id FROM organizations WHERE slug = ?").get(slug);
  if (taken) slug = `${slug}-${randomUUID().slice(0, 4)}`;
  const id = randomUUID();
  db.prepare(
    "INSERT INTO organizations (id, name, kind, slug, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, name, input.kind, slug, nowIso());
  writeAudit(db, {
    actor,
    organizationId: id,
    action: "org_created",
    summary: `${actor.name} created ${name}.`,
    ipHash,
  });
  return { id, name, kind: input.kind, slug };
}

export function createSeason(db, actor, input, ipHash) {
  requirePermission(actor, "season:manage");
  const name = cleanText(input?.name, { min: 3, max: 80 });
  if (!name) fail(400, "Enter a season name between 3 and 80 characters.");
  if (!isIsoDate(input?.startsOn) || !isIsoDate(input?.endsOn) || input.startsOn > input.endsOn) {
    fail(400, "Enter a start date and an end date, with the end on or after the start.");
  }
  const status = input?.status === "active" ? "active" : "upcoming";
  const id = randomUUID();
  db.prepare(
    "INSERT INTO seasons (id, name, starts_on, ends_on, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, name, input.startsOn, input.endsOn, status, nowIso());
  writeAudit(db, {
    actor,
    organizationId: null,
    action: "season_created",
    summary: `${actor.name} opened the season ${name}.`,
    ipHash,
  });
  return { id, name, startsOn: input.startsOn, endsOn: input.endsOn, status };
}

export function joinSeason(db, actor, input, ipHash) {
  requirePermission(actor, "season:join");
  const season = loadSeason(db, input?.seasonId);
  if (season.status === "closed" || manilaToday() > season.ends_on) {
    fail(400, "That season is closed.");
  }
  const organizationId = actor.role === "platform_admin" ? input?.organizationId : actor.organizationId;
  if (!organizationId) fail(400, "Choose an organization to enroll.");
  const org = db.prepare("SELECT id, name FROM organizations WHERE id = ?").get(organizationId);
  if (!org) fail(404, "That organization does not exist.");
  if (actor.role !== "platform_admin" && organizationId !== actor.organizationId) {
    fail(403, "You can only enroll your own organization.");
  }

  db.prepare(
    `INSERT INTO season_members (season_id, organization_id, joined_at) VALUES (?, ?, ?)
     ON CONFLICT(season_id, organization_id) DO NOTHING`,
  ).run(season.id, org.id, nowIso());
  writeAudit(db, {
    actor,
    organizationId: org.id,
    action: "season_joined",
    summary: `${org.name} joined ${season.name}.`,
    ipHash,
  });
}

export function createUnit(db, actor, input, ipHash) {
  requirePermission(actor, "unit:manage");
  const organizationId = actor.role === "platform_admin" ? input?.organizationId : actor.organizationId;
  const org = db.prepare("SELECT id, name, kind FROM organizations WHERE id = ?").get(organizationId);
  if (!org) fail(404, "That organization does not exist.");
  if (actor.role !== "platform_admin" && org.id !== actor.organizationId) {
    fail(403, "You can only add places inside your organization.");
  }
  const name = cleanText(input?.name, { min: 2, max: 80 });
  if (!name) fail(400, "Enter a place name between 2 and 80 characters.");
  const allowed = UNIT_KINDS[org.kind] || [];
  if (!allowed.includes(input?.kind)) {
    fail(400, `Choose one of: ${allowed.join(", ")}.`);
  }
  const duplicate = db.prepare(
    "SELECT id FROM units WHERE organization_id = ? AND name = ?",
  ).get(org.id, name);
  if (duplicate) fail(409, "That place is already on the list.");

  const id = randomUUID();
  db.prepare(
    "INSERT INTO units (id, organization_id, name, kind, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, org.id, name, input.kind, nowIso());
  writeAudit(db, {
    actor,
    organizationId: org.id,
    action: "unit_created",
    summary: `${actor.name} added ${name}.`,
    ipHash,
  });
  return { id, name, kind: input.kind, organizationId: org.id };
}

export function createMember(db, actor, input, ipHash) {
  const role = input?.role;
  if (!["org_admin", "middleman", "viewer"].includes(role)) {
    fail(400, "Choose an organization admin, middleman, or viewer.");
  }
  requirePermission(actor, `user:create:${role}`);
  if (role === "org_admin" && actor.role !== "platform_admin") {
    fail(403, "You do not have permission to do that.");
  }

  const organizationId = actor.role === "platform_admin" ? input?.organizationId : actor.organizationId;
  const org = db.prepare("SELECT id, name FROM organizations WHERE id = ?").get(organizationId);
  if (!org) fail(400, "Choose the organization this person belongs to.");
  const name = cleanText(input?.name, { min: 2, max: 80 });
  if (!name) fail(400, "Enter the person's name, between 2 and 80 characters.");
  const email = validateEmail(input?.email);
  if (!email) fail(400, "Enter a valid email address.");
  const passwordError = validatePassword(input?.password);
  if (passwordError) fail(400, passwordError);
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) fail(409, "That email is already in use.");

  const id = randomUUID();
  withTransaction(db, () => {
    db.prepare(
      `INSERT INTO users (id, organization_id, email, name, password_hash, role, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
    ).run(id, org.id, email, name, hashPassword(input.password), role, nowIso());
    writeAudit(db, {
      actor,
      organizationId: org.id,
      action: "user_created",
      summary: `${actor.name} added ${name} as ${role.replaceAll("_", " ")}.`,
      ipHash,
    });
  });
  return { id, name, email, role, organizationId: org.id };
}

export function deactivateMember(db, actor, userId, ipHash) {
  requirePermission(actor, "user:deactivate");
  if (userId === actor.id) fail(400, "You cannot deactivate your own account.");
  const target = db.prepare(
    "SELECT id, name, role, organization_id, active FROM users WHERE id = ?",
  ).get(userId);
  if (!target || !target.active) fail(404, "That account is not active.");
  if (target.role === "platform_admin") fail(403, "You do not have permission to do that.");
  if (actor.role === "org_admin") {
    if (target.organization_id !== actor.organizationId) fail(403, "You can only manage people in your organization.");
    if (target.role === "org_admin") fail(403, "Ask the platform admin to change another official's access.");
  }

  withTransaction(db, () => {
    db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(target.id);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(target.id);
    writeAudit(db, {
      actor,
      organizationId: target.organization_id,
      action: "user_deactivated",
      summary: `${actor.name} deactivated ${target.name}.`,
      ipHash,
    });
  });
}

export function seasonStandings(db, seasonId) {
  const rows = db.prepare(
    `SELECT o.id AS organization_id, o.name, o.kind,
            ROUND(COALESCE(SUM(CASE WHEN c.voided = 0 THEN c.kilos END), 0), 2) AS kilos
     FROM season_members sm
     JOIN organizations o ON o.id = sm.organization_id
     LEFT JOIN collections c ON c.organization_id = o.id AND c.season_id = sm.season_id
     WHERE sm.season_id = ?
     GROUP BY o.id
     ORDER BY kilos DESC, o.name COLLATE NOCASE ASC`,
  ).all(seasonId);
  return rank(rows.map((row) => ({
    organizationId: row.organization_id,
    name: row.name,
    kind: row.kind,
    kilos: round2(row.kilos),
  })));
}

export function unitStandings(db, organizationId, seasonId) {
  const rows = db.prepare(
    `SELECT u.id AS unit_id, u.name, u.kind,
            ROUND(COALESCE(SUM(CASE WHEN c.voided = 0 THEN c.kilos END), 0), 2) AS kilos
     FROM units u
     LEFT JOIN collections c ON c.unit_id = u.id AND c.season_id = ? AND c.organization_id = u.organization_id
     WHERE u.organization_id = ?
     GROUP BY u.id
     ORDER BY kilos DESC, u.name COLLATE NOCASE ASC`,
  ).all(seasonId, organizationId);
  return rank(rows.map((row) => ({
    unitId: row.unit_id,
    name: row.name,
    kind: row.kind,
    kilos: round2(row.kilos),
  })));
}

export function rank(rows) {
  let lastKilos = null;
  let lastRank = 0;
  return rows.map((row, index) => {
    if (lastKilos === null || row.kilos < lastKilos) {
      lastRank = index + 1;
      lastKilos = row.kilos;
    }
    return { ...row, rank: lastRank };
  });
}

