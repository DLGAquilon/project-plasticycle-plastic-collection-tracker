import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fail } from "./errors.js";
import { cleanText, hashPassword, hashToken, validateEmail, validatePassword } from "./security.js";
import { nowIso } from "./time.js";

const INVITE_HOURS = 72;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const HUB_TYPES = [
  { id: "barangay", kind: "barangay", label: "Barangay" },
  { id: "campus", kind: "campus", label: "Campus Organization" },
  { id: "ngo", kind: "institution", label: "NGO" },
  { id: "corporate", kind: "institution", label: "Corporate ESG" },
];

export function roleBadge(user) {
  if (user?.isOwner) return "Super admin";
  if (user?.role === "org_admin") return "Coordinator";
  if (user?.role === "middleman") return "Middleman";
  if (user?.role === "platform_admin") return "Platform admin";
  return "Participant/Viewer";
}

function columnExists(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
}

function addColumn(db, table, column, definition) {
  if (!columnExists(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function migrateOnboarding(db) {
  addColumn(db, "organizations", "type_label", "TEXT");
  addColumn(db, "organizations", "logo_path", "TEXT");
  addColumn(db, "organizations", "campaign_rules", "TEXT");
  addColumn(db, "organizations", "min_kilos", "REAL DEFAULT 0.01");
  addColumn(db, "organizations", "max_kilos", "REAL DEFAULT 5000");
  addColumn(db, "organizations", "setup_complete", "INTEGER NOT NULL DEFAULT 1");
  addColumn(db, "organizations", "is_template", "INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "users", "is_owner", "INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "users", "join_status", "TEXT NOT NULL DEFAULT 'active'");
  db.exec(`
    CREATE TABLE IF NOT EXISTS coordinator_invites (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      code_hash TEXT NOT NULL UNIQUE,
      created_by TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_by TEXT,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_requests (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'declined')),
      created_at TEXT NOT NULL,
      reviewed_by TEXT,
      reviewed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_role_requests_org ON role_requests (organization_id, status);
  `);
  try {
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_name_nocase ON organizations (lower(name))");
  } catch {
    /* An older database with two identical names keeps the application check. */
  }
  const templates = ["org_san_antonio", "org_matina", "org_mmcm", "org_riverside", "org_davao", "org_tagum"];
  db.prepare(
    `UPDATE organizations SET is_template = 1 WHERE id IN (${templates.map(() => "?").join(", ")})`,
  ).run(...templates);
}

export function ensureOrganizationOwners(db) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM users WHERE is_owner = 1").get().count;
  if (count > 0) return;
  const rows = db.prepare(
    `SELECT MIN(id) AS id FROM users
     WHERE role = 'org_admin' AND organization_id IS NOT NULL
     GROUP BY organization_id`,
  ).all();
  const update = db.prepare("UPDATE users SET is_owner = 1 WHERE id = ?");
  for (const row of rows) update.run(row.id);
}

function audit(db, { actorId, organizationId, action, summary, ipHash }) {
  db.prepare(
    `INSERT INTO audit_log (id, actor_id, organization_id, action, summary, ip_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), actorId || null, organizationId || null, action, String(summary).slice(0, 240), ipHash || null, nowIso());
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

function slugify(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return base || "hub";
}

function uniqueSlug(db, name) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;
  while (db.prepare("SELECT 1 AS ok FROM organizations WHERE slug = ?").get(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function resolveHubType(input) {
  const typeId = String(input?.organizationType || "");
  if (typeId === "other") {
    const label = cleanText(input?.organizationTypeOther, { min: 2, max: 40 });
    if (!label) fail(400, "Specify the organization type, between 2 and 40 characters.");
    return { kind: "institution", label };
  }
  const known = HUB_TYPES.find((type) => type.id === typeId);
  if (!known) fail(400, "Choose a barangay, campus organization, NGO, corporate ESG team, or Other.");
  return { kind: known.kind, label: known.label };
}

function accountFields(input) {
  const name = cleanText(input?.name, { min: 2, max: 80 });
  if (!name) fail(400, "Enter your name, between 2 and 80 characters.");
  const email = validateEmail(input?.email);
  if (!email) fail(400, "Enter a valid email address.");
  const passwordError = validatePassword(input?.password);
  if (passwordError) fail(400, passwordError);
  return { name, email };
}

export function registerOrganization(db, input, ipHash) {
  const account = accountFields(input);
  const organizationName = cleanText(input?.organizationName, { min: 2, max: 80 });
  if (!organizationName) fail(400, "Enter the organization name, between 2 and 80 characters.");
  const type = resolveHubType(input);
  const taken = db.prepare("SELECT id FROM organizations WHERE lower(name) = lower(?)").get(organizationName);
  if (taken) fail(409, "An organization with that name already exists. Join it, or choose another name.");
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(account.email);
  if (existing) fail(409, "That email is already in use.");

  const organizationId = randomUUID();
  const userId = randomUUID();
  const slug = uniqueSlug(db, organizationName);
  withTransaction(db, () => {
    db.prepare(
      `INSERT INTO organizations (
         id, name, kind, slug, created_at, type_label, setup_complete, min_kilos, max_kilos
       ) VALUES (?, ?, ?, ?, ?, ?, 0, 0.01, 5000)`,
    ).run(organizationId, organizationName, type.kind, slug, nowIso(), type.label);
    db.prepare(
      `INSERT INTO users (
         id, organization_id, email, name, password_hash, role, active, created_at, is_owner
       ) VALUES (?, ?, ?, ?, ?, 'org_admin', 1, ?, 1)`,
    ).run(userId, organizationId, account.email, account.name, hashPassword(input.password), nowIso());
    audit(db, {
      actorId: userId,
      organizationId,
      action: "organization_registered",
      summary: `${account.name} registered ${organizationName} and became its super admin.`,
      ipHash,
    });
  });
  return { organizationId, email: account.email };
}

function assertOwner(actor) {
  if (!actor?.active) fail(401, "Sign in required.");
  if (!actor.isOwner || actor.role !== "org_admin" || !actor.organizationId) {
    fail(403, "Only the super admin of this organization can do that.");
  }
}

function newInviteCode() {
  const bytes = randomBytes(8);
  let raw = "";
  for (let index = 0; index < 8; index += 1) raw += CODE_ALPHABET[bytes[index] % CODE_ALPHABET.length];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function createCoordinatorInvite(db, actor, ipHash) {
  assertOwner(actor);
  const code = newInviteCode();
  const expiresAt = new Date(Date.now() + INVITE_HOURS * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO coordinator_invites (
       id, organization_id, code_hash, created_by, expires_at, created_at
     ) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(randomUUID(), actor.organizationId, hashToken(code), actor.id, expiresAt, nowIso());
  audit(db, {
    actorId: actor.id,
    organizationId: actor.organizationId,
    action: "coordinator_invite_created",
    summary: `${actor.name} created a coordinator invite that expires in ${INVITE_HOURS} hours.`,
    ipHash,
  });
  return { code, expiresAt };
}

function normalizeCode(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function assertActiveMember(actor) {
  if (actor?.joinStatus && actor.joinStatus !== "active") {
    fail(403, "An admin still needs to confirm this account.");
  }
}

export function redeemCoordinatorInvite(db, actor, code, ipHash) {
  if (!actor?.active) fail(401, "Sign in required.");
  assertActiveMember(actor);
  if (actor.role !== "viewer" || !actor.organizationId) {
    fail(403, "Invite codes are for participant accounts in this organization.");
  }
  const compact = normalizeCode(code);
  if (compact.length !== 8) fail(400, "Enter the coordinator invite code.");
  const stored = db.prepare(
    "SELECT id, organization_id, expires_at, used_at FROM coordinator_invites WHERE code_hash = ?",
  ).get(hashToken(`${compact.slice(0, 4)}-${compact.slice(4)}`));
  if (!stored) fail(400, "That invite code is not valid.");
  if (stored.used_at) fail(400, "That invite code has already been used.");
  if (stored.expires_at <= nowIso()) fail(400, "That invite code has expired.");
  if (stored.organization_id !== actor.organizationId) {
    fail(403, "That invite code belongs to a different organization.");
  }
  withTransaction(db, () => {
    db.prepare("UPDATE users SET role = 'org_admin' WHERE id = ? AND role = 'viewer'").run(actor.id);
    db.prepare(
      "UPDATE coordinator_invites SET used_by = ?, used_at = ? WHERE id = ? AND used_at IS NULL",
    ).run(actor.id, nowIso(), stored.id);
    audit(db, {
      actorId: actor.id,
      organizationId: actor.organizationId,
      action: "coordinator_invite_redeemed",
      summary: `${actor.name} became a coordinator with an invite code.`,
      ipHash,
    });
  });
  return { role: "org_admin", isOwner: false };
}

export function requestAdminRights(db, actor, ipHash) {
  if (!actor?.active) fail(401, "Sign in required.");
  assertActiveMember(actor);
  if (actor.role !== "viewer" || !actor.organizationId) {
    fail(403, "Only a participant can request coordinator access.");
  }
  const pending = db.prepare(
    "SELECT id FROM role_requests WHERE user_id = ? AND status = 'pending'",
  ).get(actor.id);
  if (pending) fail(409, "Your request is already waiting for the super admin.");
  const id = randomUUID();
  db.prepare(
    `INSERT INTO role_requests (id, organization_id, user_id, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`,
  ).run(id, actor.organizationId, actor.id, nowIso());
  audit(db, {
    actorId: actor.id,
    organizationId: actor.organizationId,
    action: "admin_rights_requested",
    summary: `${actor.name} requested coordinator access.`,
    ipHash,
  });
  return { id, status: "pending" };
}

export function listRoleRequests(db, actor) {
  assertOwner(actor);
  return db.prepare(
    `SELECT r.id, r.status, r.created_at, u.name, u.email
     FROM role_requests r
     JOIN users u ON u.id = r.user_id
     WHERE r.organization_id = ? AND r.status = 'pending'
     ORDER BY r.created_at`,
  ).all(actor.organizationId).map((row) => ({
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    name: row.name,
    email: row.email,
  }));
}

export function reviewRoleRequest(db, actor, requestId, decision, ipHash) {
  assertOwner(actor);
  if (decision !== "approve" && decision !== "decline") fail(400, "Choose approve or decline.");
  const request = db.prepare(
    "SELECT id, user_id, organization_id, status FROM role_requests WHERE id = ?",
  ).get(requestId);
  if (!request || request.organization_id !== actor.organizationId) fail(404, "That request is not on your list.");
  if (request.status !== "pending") fail(400, "That request has already been reviewed.");
  const status = decision === "approve" ? "approved" : "declined";
  withTransaction(db, () => {
    if (decision === "approve") {
      db.prepare(
        "UPDATE users SET role = 'org_admin' WHERE id = ? AND organization_id = ? AND role = 'viewer'",
      ).run(request.user_id, actor.organizationId);
    }
    db.prepare(
      "UPDATE role_requests SET status = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?",
    ).run(status, actor.id, nowIso(), request.id);
    audit(db, {
      actorId: actor.id,
      organizationId: actor.organizationId,
      action: decision === "approve" ? "admin_rights_approved" : "admin_rights_declined",
      summary: `${actor.name} ${status} a coordinator request.`,
      ipHash,
    });
  });
  return { id: request.id, status };
}

function parseBound(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(400, `Enter a ${label} in kilograms.`);
  const rounded = Math.round(number * 100) / 100;
  if (rounded < 0.01 || rounded > 5000) fail(400, `${label} must stay between 0.01 and 5,000 kg.`);
  return rounded;
}

export function hubSetup(db, actor) {
  if (!actor?.isOwner || !actor.organizationId) fail(403, "The setup wizard is for the super admin of a new organization.");
  const row = db.prepare(
    `SELECT name, type_label, campaign_rules, min_kilos, max_kilos, logo_path, setup_complete
     FROM organizations WHERE id = ?`,
  ).get(actor.organizationId);
  if (!row) fail(404, "That organization does not exist.");
  return {
    organizationName: row.name,
    typeLabel: row.type_label,
    campaignRules: row.campaign_rules || "",
    minKilos: row.min_kilos ?? 0.01,
    maxKilos: row.max_kilos ?? 5000,
    hasLogo: Boolean(row.logo_path),
    setupComplete: Boolean(row.setup_complete),
  };
}

export function saveHubSetup(db, actor, input, ipHash) {
  if (!actor?.isOwner || !actor.organizationId) fail(403, "The setup wizard is for the super admin of a new organization.");
  const rules = cleanText(input?.campaignRules, { min: 0, max: 1200 });
  if (rules == null) fail(400, "Keep the campaign rules within 1,200 characters.");
  const minKilos = parseBound(input?.minKilos, "The lightest weigh-in");
  const maxKilos = parseBound(input?.maxKilos, "The heaviest weigh-in");
  if (minKilos > maxKilos) fail(400, "The lightest weigh-in cannot be heavier than the heaviest.");
  db.prepare(
    `UPDATE organizations
     SET campaign_rules = ?, min_kilos = ?, max_kilos = ?, setup_complete = 1
     WHERE id = ?`,
  ).run(rules, minKilos, maxKilos, actor.organizationId);
  audit(db, {
    actorId: actor.id,
    organizationId: actor.organizationId,
    action: "hub_setup_saved",
    summary: `${actor.name} saved campaign rules and weigh-in limits.`,
    ipHash,
  });
  return { setupComplete: true, minKilos, maxKilos };
}

const LOGO_TYPES = {
  "image/png": { ext: "png", check: (bytes) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  "image/jpeg": { ext: "jpg", check: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/webp": { ext: "webp", check: (bytes) => bytes.slice(0, 4).toString() === "RIFF" && bytes.slice(8, 12).toString() === "WEBP" },
};

function logosDirectory() {
  const directory = path.join(process.cwd(), "data", "logos");
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

export function saveHubLogo(db, actor, file, ipHash) {
  if (!actor?.isOwner || !actor.organizationId) fail(403, "Only the super admin can set the organization logo.");
  const spec = LOGO_TYPES[file?.type];
  const bytes = Buffer.from(file?.bytes || []);
  if (!spec || bytes.length < 12 || bytes.length > 1_000_000 || !spec.check(bytes)) {
    fail(400, "Upload a PNG, JPEG, or WebP logo under 1 MB.");
  }
  const filename = `${actor.organizationId}.${spec.ext}`;
  const previous = db.prepare("SELECT logo_path FROM organizations WHERE id = ?").get(actor.organizationId);
  fs.writeFileSync(path.join(logosDirectory(), filename), bytes);
  if (previous?.logo_path && previous.logo_path !== filename) {
    fs.rmSync(path.join(logosDirectory(), path.basename(previous.logo_path)), { force: true });
  }
  db.prepare("UPDATE organizations SET logo_path = ? WHERE id = ?").run(filename, actor.organizationId);
  audit(db, {
    actorId: actor.id,
    organizationId: actor.organizationId,
    action: "hub_logo_saved",
    summary: `${actor.name} uploaded the organization logo.`,
    ipHash,
  });
  return { hasLogo: true };
}

export function readHubLogo(db, actor) {
  if (!actor?.organizationId) return null;
  const row = db.prepare("SELECT logo_path FROM organizations WHERE id = ?").get(actor.organizationId);
  if (!row?.logo_path) return null;
  const filename = path.basename(row.logo_path);
  const full = path.join(logosDirectory(), filename);
  if (!fs.existsSync(full)) return null;
  const type = filename.endsWith(".png") ? "image/png" : filename.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return { bytes: fs.readFileSync(full), type };
}

function assertOrgAdmin(actor) {
  if (!actor?.active) fail(401, "Sign in required.");
  if (actor.role !== "org_admin" || !actor.organizationId) {
    fail(403, "Only an admin of this organization can do that.");
  }
}

export function listJoinRequests(db, actor) {
  assertOrgAdmin(actor);
  return db.prepare(
    `SELECT id, name, email, created_at
     FROM users
     WHERE organization_id = ? AND join_status = 'pending' AND active = 1
     ORDER BY created_at`,
  ).all(actor.organizationId).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  }));
}

export function reviewJoinRequest(db, actor, userId, decision, ipHash) {
  assertOrgAdmin(actor);
  if (decision !== "approve" && decision !== "decline") fail(400, "Choose approve or decline.");
  const person = db.prepare(
    "SELECT id, name, email, organization_id, join_status FROM users WHERE id = ?",
  ).get(userId);
  if (!person || person.organization_id !== actor.organizationId) fail(404, "That request is not on your list.");
  if (person.join_status !== "pending") fail(400, "That request has already been reviewed.");
  const status = decision === "approve" ? "active" : "declined";
  db.prepare("UPDATE users SET join_status = ? WHERE id = ?").run(status, person.id);
  audit(db, {
    actorId: actor.id,
    organizationId: actor.organizationId,
    action: decision === "approve" ? "join_approved" : "join_declined",
    summary: `${actor.name} ${decision === "approve" ? "confirmed" : "declined"} ${person.email}.`,
    ipHash,
  });
  return { id: person.id, joinStatus: status };
}

export function settingsSnapshot(db, actor) {
  const pending = actor?.id
    ? db.prepare("SELECT id FROM role_requests WHERE user_id = ? AND status = 'pending'").get(actor.id)
    : null;
  return {
    badge: roleBadge(actor),
    role: actor.role,
    isOwner: Boolean(actor.isOwner),
    name: actor.name,
    organizationName: actor.organizationName,
    joinStatus: actor.joinStatus || "active",
    canRequest: actor.role === "viewer" && (actor.joinStatus || "active") === "active",
    requestPending: Boolean(pending),
  };
}
