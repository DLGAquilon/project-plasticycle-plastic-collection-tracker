process.env.PLASTICYCLE_SCRYPT_N = "1024";

import assert from "node:assert/strict";
import test from "node:test";
import { createCollection, getActorByEmail } from "../lib/actions.js";
import { createCompetition, listCompetitions, lockCompetition } from "../lib/competitions.js";
import { createDatabase, seedIfEmpty } from "../lib/db.js";
import { ActionError } from "../lib/errors.js";

function database() {
  const db = createDatabase(":memory:");
  seedIfEmpty(db);
  return db;
}

test("a viewer only receives the competition they are enrolled in", () => {
  const db = database();
  const admin = getActorByEmail(db, "antonio.admin@plasticycle.app");
  const created = createCompetition(db, admin, {
    name: "San Antonio Purok Cup",
    kind: "barangay",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    participants: ["Purok North", "Purok South"],
  }, "ip");
  const viewer = listCompetitions(db, getActorByEmail(db, "mmcm.view@plasticycle.app"));
  const middleman = listCompetitions(db, getActorByEmail(db, "antonio.weigh@plasticycle.app"));
  assert.equal(viewer.some((item) => item.id === created.id), false);
  assert.equal(middleman.some((item) => item.id === created.id), true);
  assert.equal(middleman.find((item) => item.id === created.id).participantNoun, "Purok");
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
