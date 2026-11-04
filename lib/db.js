import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ensureSampleCompetitions, migrateCompetitions } from "./competitions.js";
import { DEMO_PASSWORD } from "./demo-accounts.js";
import { hashPassword } from "./security.js";
import { addDays, manilaNoonIso, weekStartMonday } from "./time.js";

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('barangay', 'campus', 'city', 'institution')),
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'active', 'closed')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS season_members (
  season_id TEXT NOT NULL REFERENCES seasons(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  joined_at TEXT NOT NULL,
  PRIMARY KEY (season_id, organization_id)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('platform_admin', 'org_admin', 'middleman', 'viewer')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  unit_id TEXT NOT NULL REFERENCES units(id),
  season_id TEXT NOT NULL REFERENCES seasons(id),
  recorded_by TEXT NOT NULL REFERENCES users(id),
  kilos REAL NOT NULL CHECK (kilos > 0 AND kilos <= 5000),
  note TEXT,
  client_request_id TEXT,
  voided INTEGER NOT NULL DEFAULT 0 CHECK (voided IN (0, 1)),
  void_reason TEXT,
  voided_by TEXT REFERENCES users(id),
  voided_at TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_request
  ON collections (recorded_by, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_collections_org_season
  ON collections (organization_id, season_id, voided);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  organization_id TEXT,
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  ip_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log (organization_id, created_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  email TEXT PRIMARY KEY,
  failures INTEGER NOT NULL,
  locked_until TEXT
);
`;

export function createDatabase(filename) {
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 3000");
  if (filename !== ":memory:") db.exec("PRAGMA journal_mode = WAL");
  db.exec(SCHEMA);
  migrateCompetitions(db);
  return db;
}

export function getDb() {
  if (!globalThis.__plasticycleDb) {
    const filename = process.env.PLASTICYCLE_DB || path.join(process.cwd(), "data", "plasticycle.db");
    if (filename !== ":memory:") fs.mkdirSync(path.dirname(filename), { recursive: true });
    const db = createDatabase(filename);
    seedIfEmpty(db);
    globalThis.__plasticycleDb = db;
  }
  migrateCompetitions(globalThis.__plasticycleDb);
  ensureSampleCompetitions(globalThis.__plasticycleDb);
  return globalThis.__plasticycleDb;
}

function insertOrg(db, org) {
  db.prepare(
    "INSERT INTO organizations (id, name, kind, slug, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(org.id, org.name, org.kind, org.slug, "2026-01-01T00:00:00.000Z");
}

function insertUnit(db, unit) {
  db.prepare(
    "INSERT INTO units (id, organization_id, name, kind, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(unit.id, unit.organizationId, unit.name, unit.kind, "2026-01-01T00:00:00.000Z");
}

function insertUser(db, user) {
  db.prepare(
    `INSERT INTO users (id, organization_id, email, name, password_hash, role, active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
  ).run(
    user.id,
    user.organizationId,
    user.email,
    user.name,
    hashPassword(user.password),
    user.role,
    "2026-01-01T00:00:00.000Z",
  );
}

function mulberry32(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedIfEmpty(db) {
  const existing = db.prepare("SELECT COUNT(*) AS count FROM users").get();
  if (existing.count > 0) return;

  const orgs = [
    ["org_san_antonio", "Barangay San Antonio", "barangay", "barangay-san-antonio"],
    ["org_matina", "Barangay Matina Crossing", "barangay", "barangay-matina-crossing"],
    ["org_mmcm", "Mapúa Malayan Colleges Mindanao", "campus", "mmcm"],
    ["org_riverside", "Riverside Institute", "campus", "riverside-institute"],
    ["org_davao", "Davao City Environment Office", "city", "davao-city-environment-office"],
    ["org_tagum", "Tagum City Environment Office", "city", "tagum-city-environment-office"],
  ];
  for (const [id, name, kind, slug] of orgs) insertOrg(db, { id, name, kind, slug });

  const units = [
    ["unit_sa_river", "org_san_antonio", "Sitio Riverside", "sitio"],
    ["unit_sa_hill", "org_san_antonio", "Sitio Hillside", "sitio"],
    ["unit_sa_p1", "org_san_antonio", "Purok 1", "purok"],
    ["unit_sa_p4", "org_san_antonio", "Purok 4", "purok"],
    ["unit_ma_p2", "org_matina", "Purok 2", "purok"],
    ["unit_ma_p5", "org_matina", "Purok 5", "purok"],
    ["unit_ma_bank", "org_matina", "Sitio Bankerohan", "sitio"],
    ["unit_mm_eng", "org_mmcm", "College of Engineering", "department"],
    ["unit_mm_bus", "org_mmcm", "College of Business", "department"],
    ["unit_mm_shs", "org_mmcm", "Senior High School", "department"],
    ["unit_mm_cas", "org_mmcm", "College of Arts and Sciences", "department"],
    ["unit_ri_sci", "org_riverside", "Science Department", "department"],
    ["unit_ri_art", "org_riverside", "Arts Department", "department"],
    ["unit_ri_hs", "org_riverside", "High School", "department"],
    ["unit_dv_buc", "org_davao", "Barangay Bucana", "barangay"],
    ["unit_dv_tal", "org_davao", "Barangay Talomo", "barangay"],
    ["unit_dv_buh", "org_davao", "Barangay Buhangin", "barangay"],
    ["unit_dv_agd", "org_davao", "Barangay Agdao", "barangay"],
    ["unit_tg_mag", "org_tagum", "Barangay Magugpo", "barangay"],
    ["unit_tg_vis", "org_tagum", "Barangay Visayan Village", "barangay"],
    ["unit_tg_apo", "org_tagum", "Barangay Apokon", "barangay"],
  ];
  for (const [id, organizationId, name, kind] of units) {
    insertUnit(db, { id, organizationId, name, kind });
  }

  db.prepare(
    `INSERT INTO seasons (id, name, starts_on, ends_on, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    "season_2026",
    "2026 Annual Single-Use Plastic Drive",
    "2026-01-01",
    "2026-12-31",
    "active",
    "2026-01-01T00:00:00.000Z",
  );
  db.prepare(
    `INSERT INTO seasons (id, name, starts_on, ends_on, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    "season_2027",
    "2027 Annual Single-Use Plastic Drive",
    "2027-01-01",
    "2027-12-31",
    "upcoming",
    "2026-01-01T00:00:00.000Z",
  );

  const enroll = db.prepare(
    "INSERT INTO season_members (season_id, organization_id, joined_at) VALUES (?, ?, ?)",
  );
  for (const [id] of orgs) enroll.run("season_2026", id, "2026-01-01T00:00:00.000Z");

  const users = [
    ["user_platform", null, "platform@plasticycle.app", "PlastiCycle Operator", DEMO_PASSWORD.platform, "platform_admin"],
    ["user_antonio_admin", "org_san_antonio", "antonio.admin@plasticycle.app", "Kapitan Rosa Reyes", DEMO_PASSWORD.barangayAdmin, "org_admin"],
    ["user_antonio_weigh", "org_san_antonio", "antonio.weigh@plasticycle.app", "Jun Dela Cruz", DEMO_PASSWORD.barangayMiddleman, "middleman"],
    ["user_mmcm_admin", "org_mmcm", "mmcm.admin@plasticycle.app", "Campus Sustainability Office", DEMO_PASSWORD.campusAdmin, "org_admin"],
    ["user_mmcm_weigh", "org_mmcm", "mmcm.weigh@plasticycle.app", "Weigh Station — Engineering", DEMO_PASSWORD.campusMiddleman, "middleman"],
    ["user_mmcm_view", "org_mmcm", "mmcm.view@plasticycle.app", "Student Affairs Viewer", DEMO_PASSWORD.viewer, "viewer"],
    ["user_davao_admin", "org_davao", "davao.admin@plasticycle.app", "City Environment Officer", DEMO_PASSWORD.cityAdmin, "org_admin"],
    ["user_davao_weigh", "org_davao", "davao.weigh@plasticycle.app", "City Weigh Station", DEMO_PASSWORD.cityMiddleman, "middleman"],
    ["user_matina_weigh", "org_matina", "matina.weigh@plasticycle.app", "Matina Weigh Station", DEMO_PASSWORD.matinaMiddleman, "middleman"],
    ["user_riverside_weigh", "org_riverside", "riverside.weigh@plasticycle.app", "Riverside Weigh Station", DEMO_PASSWORD.riversideMiddleman, "middleman"],
    ["user_tagum_weigh", "org_tagum", "tagum.weigh@plasticycle.app", "Tagum Weigh Station", DEMO_PASSWORD.tagumMiddleman, "middleman"],
  ];
  for (const [id, organizationId, email, name, password, role] of users) {
    insertUser(db, { id, organizationId, email, name, password, role });
  }

  const profiles = [
    { orgId: "org_san_antonio", userId: "user_antonio_weigh", base: 42, growth: 0.85, units: ["unit_sa_river", "unit_sa_hill", "unit_sa_p1", "unit_sa_p4"], seed: 11 },
    { orgId: "org_matina", userId: "user_matina_weigh", base: 61, growth: 0.05, units: ["unit_ma_p2", "unit_ma_p5", "unit_ma_bank"], seed: 29 },
    { orgId: "org_mmcm", userId: "user_mmcm_weigh", base: 74, growth: 0.35, units: ["unit_mm_eng", "unit_mm_bus", "unit_mm_shs", "unit_mm_cas"], seed: 47 },
    { orgId: "org_riverside", userId: "user_riverside_weigh", base: 28, growth: 1.15, units: ["unit_ri_sci", "unit_ri_art", "unit_ri_hs"], seed: 71 },
    { orgId: "org_davao", userId: "user_davao_weigh", base: 310, growth: 2.4, units: ["unit_dv_buc", "unit_dv_tal", "unit_dv_buh", "unit_dv_agd"], seed: 97 },
    { orgId: "org_tagum", userId: "user_tagum_weigh", base: 240, growth: 0.4, units: ["unit_tg_mag", "unit_tg_vis", "unit_tg_apo"], seed: 123 },
  ];

  const insertCollection = db.prepare(
    `INSERT INTO collections (
      id, organization_id, unit_id, season_id, recorded_by, kilos, note, client_request_id, voided, created_at
    ) VALUES (?, ?, ?, 'season_2026', ?, ?, NULL, NULL, 0, ?)`,
  );

  const firstWeek = weekStartMonday("2026-01-05");
  const lastHistoryWeek = weekStartMonday("2026-10-26");
  for (const profile of profiles) {
    const random = mulberry32(profile.seed);
    let weekIndex = 0;
    for (let week = firstWeek; week <= lastHistoryWeek; week = addDays(week, 7), weekIndex += 1) {
      const noise = (random() - 0.5) * profile.base * 0.18;
      const kilos = Math.max(1, Math.round((profile.base + profile.growth * weekIndex + noise) * 10) / 10);
      const unitId = profile.units[Math.floor(random() * profile.units.length)];
      insertCollection.run(
        `seed_${profile.orgId}_${week}`,
        profile.orgId,
        unitId,
        profile.userId,
        kilos,
        manilaNoonIso(week),
      );
    }
  }
}
