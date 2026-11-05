process.env.PLASTICYCLE_SCRYPT_N = "1024";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { createCollection, getActorByEmail, registerViewer } from "../lib/actions.js";
import { competitionRoom, createCompetition, listCompetitions, lockCompetition } from "../lib/competitions.js";
import { createDatabase, seedIfEmpty } from "../lib/db.js";
import { ActionError } from "../lib/errors.js";
import { manilaNoonIso } from "../lib/time.js";

function database() {
  const db = createDatabase(":memory:");
  seedIfEmpty(db);
  return db;
}

test("a viewer sees the rankings of their own hub", () => {
  const db = database();
  const otherAdmin = getActorByEmail(db, "antonio.admin@plasticycle.app");
  const other = createCompetition(db, otherAdmin, {
    name: "San Antonio Purok Cup",
    kind: "barangay",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    participants: ["Purok North", "Purok South"],
  }, "ip");
  const admin = getActorByEmail(db, "mmcm.admin@plasticycle.app");
  const own = createCompetition(db, admin, {
    name: "Campus Cup",
    kind: "campus",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    participants: ["Library", "Clinic"],
  }, "ip");
  const viewer = getActorByEmail(db, "mmcm.view@plasticycle.app");
  const visible = listCompetitions(db, viewer);
  assert.equal(visible.some((item) => item.id === other.id), false);
  assert.equal(visible.some((item) => item.id === own.id), true);
  const middleman = listCompetitions(db, getActorByEmail(db, "antonio.weigh@plasticycle.app"));
  assert.equal(middleman.some((item) => item.id === other.id), true);
  assert.equal(middleman.find((item) => item.id === other.id).participantNoun, "Purok");
  const units = db.prepare(
    "SELECT unit_id FROM competition_participants WHERE competition_id = ?",
  ).all(own.id);
  const insert = db.prepare(
    `INSERT INTO collections (
      id, organization_id, unit_id, season_id, recorded_by, kilos, note, client_request_id, voided, created_at
    ) VALUES (?, 'org_mmcm', ?, ?, ?, ?, NULL, NULL, 0, ?)`,
  );
  const recorder = getActorByEmail(db, "mmcm.weigh@plasticycle.app").id;
  ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"].forEach((day, index) => {
    insert.run(randomUUID(), units[0].unit_id, own.id, recorder, 10 + index, manilaNoonIso(day));
  });
  const room = competitionRoom(db, viewer, own.id);
  assert.ok(room.standings.some((row) => row.kilos > 0));
  assert.equal(room.forecasts.find((item) => item.id === units[0].unit_id).forecast.status, "ok");
  assert.equal(room.recent.length, 0);
  assert.throws(
    () => competitionRoom(db, viewer, other.id),
    (error) => error instanceof ActionError && error.status === 404,
  );
});

test("a locked competition keeps its standings and refuses new kilos", () => {
  const db = database();
  const admin = getActorByEmail(db, "mmcm.admin@plasticycle.app");
  const created = createCompetition(db, admin, {
    name: "Engineering Departments Cup",
    kind: "campus",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    participants: ["Civil", "Electrical"],
  }, "ip");
  const roomBefore = listCompetitions(db, admin).find((item) => item.id === created.id);
  const middleman = getActorByEmail(db, "mmcm.weigh@plasticycle.app");
  const participants = db.prepare(
    "SELECT unit_id FROM competition_participants WHERE competition_id = ?",
  ).all(created.id);
  createCollection(db, middleman, {
    competitionId: created.id,
    unitId: participants[0].unit_id,
    kilos: "12.5",
  }, "ip");
  lockCompetition(db, admin, created.id, "ip");
  assert.throws(
    () => createCollection(db, middleman, {
      competitionId: created.id,
      unitId: participants[1].unit_id,
      kilos: "4",
    }, "ip"),
    (error) => error instanceof ActionError && error.status === 400 && /locked/i.test(error.message),
  );
  const after = listCompetitions(db, admin).find((item) => item.id === created.id);
  assert.equal(after.locked, true);
  assert.equal(after.totalKilos, 12.5);
  assert.equal(roomBefore.kind, "campus");
});

test("a campus competition rejects a participant from outside its list", () => {
  const db = database();
  const admin = getActorByEmail(db, "mmcm.admin@plasticycle.app");
  const created = createCompetition(db, admin, {
    name: "College Cup",
    kind: "campus",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    participants: ["Library", "Clinic"],
  }, "ip");
  assert.throws(
    () => createCollection(db, getActorByEmail(db, "mmcm.weigh@plasticycle.app"), {
      competitionId: created.id,
      unitId: "unit_mm_eng",
      kilos: "3",
    }, "ip"),
    (error) => error instanceof ActionError && error.status === 403,
  );
});

test("public signup stays a viewer even when another role is requested", () => {
  const db = database();
  const result = registerViewer(db, {
    name: "Ada Cruz",
    email: "ada.cruz@example.com",
    password: "Viewer!Pass1",
    organizationId: "org_mmcm",
    role: "platform_admin",
  }, "ip");
  assert.equal(result.user.role, "viewer");
  assert.equal(result.user.organizationId, "org_mmcm");
  assert.equal(getActorByEmail(db, "ada.cruz@example.com").role, "viewer");
});

test("each department keeps its own forecast", () => {
  const db = database();
  const admin = getActorByEmail(db, "mmcm.admin@plasticycle.app");
  const created = createCompetition(db, admin, {
    name: "Department Forecast Cup",
    kind: "campus",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    participants: ["Library", "Clinic"],
  }, "ip");
  const units = db.prepare(
    `SELECT u.id, u.name FROM competition_participants cp
     JOIN units u ON u.id = cp.unit_id WHERE cp.competition_id = ?`,
  ).all(created.id);
  const library = units.find((unit) => unit.name === "Library");
  const clinic = units.find((unit) => unit.name === "Clinic");
  const insert = db.prepare(
    `INSERT INTO collections (
      id, organization_id, unit_id, season_id, recorded_by, kilos, note, client_request_id, voided, created_at
    ) VALUES (?, 'org_mmcm', ?, ?, ?, ?, NULL, NULL, 0, ?)`,
  );
  const recorder = getActorByEmail(db, "mmcm.weigh@plasticycle.app").id;
  ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"].forEach((day, index) => {
    insert.run(randomUUID(), library.id, created.id, recorder, 10 + index, manilaNoonIso(day));
  });
  insert.run(randomUUID(), clinic.id, created.id, recorder, 4, manilaNoonIso("2026-09-07"));
  const room = competitionRoom(db, admin, created.id);
  const libraryForecast = room.forecasts.find((item) => item.name === "Library").forecast;
  const clinicForecast = room.forecasts.find((item) => item.name === "Clinic").forecast;
  assert.equal(libraryForecast.status, "ok");
  assert.equal(clinicForecast.status, "insufficient");
  assert.ok(libraryForecast.nextEightKilos > 0);
});
