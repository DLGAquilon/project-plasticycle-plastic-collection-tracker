process.env.PLASTICYCLE_SCRYPT_N = "1024";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  createCollection,
  createMember,
  deactivateMember,
  getActorByEmail,
  joinSeason,
  loginUser,
  rank,
  seasonStandings,
  voidCollection,
} from "../lib/actions.js";
import { createDatabase, seedIfEmpty } from "../lib/db.js";
import { ActionError } from "../lib/errors.js";
import { forecastWeekly } from "../lib/forecast.js";
import { parseKilos } from "../lib/security.js";
import { buildWorkspace } from "../lib/workspace.js";

function database() {
  const db = createDatabase(":memory:");
  seedIfEmpty(db);
  return db;
}

function actor(db, email) {
  return getActorByEmail(db, email);
}

test("kilograms accept a scale reading and reject ambiguous numbers", () => {
  assert.equal(parseKilos("12.5").kilos, 12.5);
  assert.equal(parseKilos("0.01").kilos, 0.01);
  assert.equal(parseKilos(12.5).kilos, 12.5);
  assert.match(parseKilos("").error, /kilograms/i);
  assert.match(parseKilos("12.345").error, /decimal/i);
  assert.match(parseKilos("5000.01").error, /5,000/);
  assert.match(parseKilos("0").error, /0\.01/);
});

test("organizations of the same kind keep competition ranks, including ties", () => {
  const board = rank([
    { name: "A", kilos: 10 },
    { name: "B", kilos: 10 },
    { name: "C", kilos: 4 },
  ]);
  assert.deepEqual(board.map((row) => row.rank), [1, 1, 3]);
});

test("a middleman can credit only a place inside their own organization", () => {
  const db = database();
  const middleman = actor(db, "antonio.weigh@plasticycle.app");
  const receipt = createCollection(db, middleman, {
    seasonId: "season_2026",
    unitId: "unit_sa_river",
    kilos: "15.25",
    clientRequestId: randomUUID(),
  }, "ip");
  assert.equal(receipt.kilos, 15.25);
  assert.equal(receipt.unitName, "Sitio Riverside");

  const again = createCollection(db, middleman, {
    seasonId: "season_2026",
    unitId: "unit_sa_river",
    kilos: "99",
    clientRequestId: receipt.id ? undefined : randomUUID(),
  }, "ip");
  assert.notEqual(again.id, receipt.id);

  const duplicate = createCollection(db, middleman, {
    seasonId: "season_2026",
    unitId: "unit_sa_hill",
    kilos: "4",
    clientRequestId: "11111111-1111-4111-8111-111111111111",
  }, "ip");
  const duplicateAgain = createCollection(db, middleman, {
    seasonId: "season_2026",
    unitId: "unit_sa_hill",
    kilos: "8",
    clientRequestId: "11111111-1111-4111-8111-111111111111",
  }, "ip");
  assert.equal(duplicateAgain.id, duplicate.id);
  assert.equal(duplicateAgain.duplicate, true);

  assert.throws(
    () => createCollection(db, middleman, {
      seasonId: "season_2026",
      unitId: "unit_ma_p2",
      kilos: "10",
    }, "ip"),
    (error) => error instanceof ActionError && error.status === 403,
  );
});

test("viewers and platform operators cannot file a weigh-in", () => {
  const db = database();
  for (const email of ["mmcm.view@plasticycle.app", "platform@plasticycle.app"]) {
    assert.throws(
      () => createCollection(db, actor(db, email), {
        seasonId: "season_2026",
        unitId: "unit_mm_eng",
        kilos: "5",
      }, "ip"),
      (error) => error instanceof ActionError && error.status === 403,
    );
  }
});

test("voided kilos leave the season total and the reason is kept for admins only", () => {
  const db = database();
  const middleman = actor(db, "antonio.weigh@plasticycle.app");
  const admin = actor(db, "antonio.admin@plasticycle.app");
  const before = seasonStandings(db, "season_2026").find((row) => row.organizationId === "org_san_antonio").kilos;
  const receipt = createCollection(db, middleman, {
    seasonId: "season_2026",
    unitId: "unit_sa_p1",
    kilos: "20",
  }, "ip");
  const after = seasonStandings(db, "season_2026").find((row) => row.organizationId === "org_san_antonio").kilos;
  assert.equal(after, Math.round((before + 20) * 100) / 100);
  voidCollection(db, admin, receipt.id, { reason: "Scale was tared wrong." }, "ip");
  const restored = seasonStandings(db, "season_2026").find((row) => row.organizationId === "org_san_antonio").kilos;
  assert.equal(restored, before);
  assert.throws(
    () => voidCollection(db, middleman, receipt.id, { reason: "Trying again now." }, "ip"),
    (error) => error instanceof ActionError && error.status === 403,
  );
});

test("participant emails stay out of middleman and viewer workspaces", () => {
  const db = database();
  db.prepare(
    `INSERT INTO collections (
      id, organization_id, unit_id, season_id, recorded_by, kilos, note, voided, created_at
    ) VALUES (?, 'org_san_antonio', 'unit_sa_hill', 'season_2026', 'user_antonio_admin', 3.5, 'private note', 0, ?)`,
  ).run("col_admin_only", new Date().toISOString());

  const middleman = buildWorkspace(db, actor(db, "antonio.weigh@plasticycle.app"));
  const viewer = buildWorkspace(db, actor(db, "mmcm.view@plasticycle.app"));
  const admin = buildWorkspace(db, actor(db, "antonio.admin@plasticycle.app"), { orgId: "org_matina" });

  assert.equal(middleman.people.length, 0);
  assert.equal(middleman.recent.some((entry) => entry.id === "col_admin_only"), false);
  assert.equal(JSON.stringify(middleman).includes("antonio.admin@plasticycle.app"), false);
  assert.equal(JSON.stringify(middleman).includes("password"), false);

  assert.equal(viewer.people.length, 0);
  assert.equal(viewer.access.weigh, false);
  assert.equal(viewer.user.email, "mmcm.view@plasticycle.app");
  assert.ok(viewer.recent.length > 0);
  assert.ok(viewer.recent.every((entry) => entry.recorderName === null && entry.note === null));
  assert.equal(JSON.stringify(viewer).includes("mmcm.weigh@plasticycle.app"), false);
  assert.equal(JSON.stringify(viewer).includes("mmcm.admin@plasticycle.app"), false);

  assert.equal(admin.organization.id, "org_san_antonio");
  assert.equal(admin.places.some((place) => place.name === "Purok 2"), false);
  assert.equal(admin.recent.some((entry) => entry.id === "col_admin_only" && entry.recorderName === "Kapitan Rosa Reyes"), true);
});

test("officials can add a middleman, and a middleman cannot add anyone", () => {
  const db = database();
  const admin = actor(db, "antonio.admin@plasticycle.app");
  const created = createMember(db, admin, {
    name: "Nilo Santos",
    email: "nilo.santos@plasticycle.app",
    password: "Station!Pass1",
    role: "middleman",
  }, "ip");
  assert.equal(created.role, "middleman");
  assert.equal(created.organizationId, "org_san_antonio");
  assert.throws(
    () => createMember(db, actor(db, "antonio.weigh@plasticycle.app"), {
      name: "Sneaky User",
      email: "sneaky@plasticycle.app",
      password: "Station!Pass1",
      role: "org_admin",
    }, "ip"),
    (error) => error instanceof ActionError && error.status === 403,
  );
  assert.throws(
    () => deactivateMember(db, admin, "user_mmcm_weigh", "ip"),
    (error) => error instanceof ActionError && error.status === 403,
  );
});

test("failed sign-ins share one message and then lock", () => {
  const db = database();
  assert.throws(
    () => loginUser(db, { email: "nobody@plasticycle.app", password: "whatever1", ipHash: "a" }),
    (error) => error instanceof ActionError && error.status === 401 && error.message === "Invalid email or password.",
  );
  assert.throws(
    () => loginUser(db, { email: "antonio.weigh@plasticycle.app", password: "wrong-password", ipHash: "a" }),
    (error) => error.status === 401 && error.message === "Invalid email or password.",
  );
  for (let attempt = 0; attempt < 4; attempt += 1) {
    assert.throws(
      () => loginUser(db, { email: "antonio.weigh@plasticycle.app", password: "still-wrong", ipHash: "a" }),
      (error) => error.status === 401 || error.status === 429,
    );
  }
  assert.throws(
    () => loginUser(db, { email: "antonio.weigh@plasticycle.app", password: "Weigh!Station1", ipHash: "a" }),
    (error) => error.status === 429,
  );
});

test("weekly totals become an eight-week trend, and a short history does not pretend to forecast", () => {
  const db = database();
  const workspace = buildWorkspace(db, actor(db, "mmcm.admin@plasticycle.app"));
  assert.equal(workspace.forecast.status, "ok");
  assert.equal(workspace.forecast.projection.length, 8);
  assert.ok(workspace.forecast.nextEightKilos > 0);
  assert.equal(workspace.rank.kindOf, 2);

  const thin = forecastWeekly([
    { weekStart: "2026-01-05", kilos: 10 },
    { weekStart: "2026-01-12", kilos: 12 },
  ]);
  assert.equal(thin.status, "insufficient");

  const rising = forecastWeekly([
    { weekStart: "2026-01-05", kilos: 10 },
    { weekStart: "2026-01-12", kilos: 20 },
    { weekStart: "2026-01-19", kilos: 30 },
    { weekStart: "2026-01-26", kilos: 40 },
  ]);
  assert.ok(rising.weeklyChange > 0);
  assert.ok(rising.projection[0].kilos > 40);
});

test("an organization can join the next season but cannot weigh into it early", () => {
  const db = database();
  const admin = actor(db, "antonio.admin@plasticycle.app");
  joinSeason(db, admin, { seasonId: "season_2027" }, "ip");
  assert.throws(
    () => createCollection(db, actor(db, "antonio.weigh@plasticycle.app"), {
      seasonId: "season_2027",
      unitId: "unit_sa_river",
      kilos: "5",
    }, "ip"),
    (error) => error instanceof ActionError && error.status === 400,
  );
});
