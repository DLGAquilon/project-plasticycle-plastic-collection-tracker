process.env.PLASTICYCLE_SCRYPT_N = "1024";

import assert from "node:assert/strict";
import test from "node:test";
import { createCollection, getActorByEmail, listPublicOrganizations, loginUser, registerViewer } from "../lib/actions.js";
import { createCompetition } from "../lib/competitions.js";
import { createDatabase, seedIfEmpty } from "../lib/db.js";
import { ActionError } from "../lib/errors.js";
import {
  createCoordinatorInvite,
  listRoleRequests,
  redeemCoordinatorInvite,
  listJoinRequests,
  registerOrganization,
  requestAdminRights,
  reviewJoinRequest,
  reviewRoleRequest,
  saveHubSetup,
} from "../lib/onboarding.js";

const password = "Hub!Admin01";

function database() {
  const db = createDatabase(":memory:");
  seedIfEmpty(db);
  return db;
}

function hub(db, email, organizationName, extra = {}) {
  return registerOrganization(db, {
    name: "Liza Santos",
    email,
    password,
    organizationName,
    organizationType: "barangay",
    ...extra,
  }, "ip");
}

test("the first registrant of a new organization is its super admin", () => {
  const db = database();
  const created = hub(db, "liza@example.com", "Barangay Mintal");
  const session = loginUser(db, { email: created.email, password, ipHash: "ip" });
  assert.equal(session.user.role, "org_admin");
  assert.equal(session.user.isOwner, true);
  assert.equal(session.user.setupComplete, false);
  const saved = saveHubSetup(db, getActorByEmail(db, "liza@example.com"), {
    campaignRules: "Puroks bring plastic on Saturdays.",
    minKilos: "0.50",
    maxKilos: "40",
  }, "ip");
  assert.equal(saved.setupComplete, true);
  assert.throws(
    () => hub(db, "other@example.com", "barangay mintal"),
    (error) => error instanceof ActionError && error.status === 409,
  );
});

test("other requires a specified organization type", () => {
  const db = database();
  assert.throws(
    () => hub(db, "nico@example.com", "Coastal Watch", { organizationType: "other" }),
    (error) => error instanceof ActionError && error.status === 400,
  );
  hub(db, "nico@example.com", "Coastal Watch", {
    organizationType: "other",
    organizationTypeOther: "Homeowners association",
  });
  const row = db.prepare("SELECT kind, type_label FROM organizations WHERE name = ?").get("Coastal Watch");
  assert.equal(row.kind, "institution");
  assert.equal(row.type_label, "Homeowners association");
});

test("an invite promotes a viewer only inside the same organization", () => {
  const db = database();
  registerViewer(db, {
    name: "Ada Cruz",
    email: "ada.invite@example.com",
    password: "Viewer!Pass1",
    organizationId: "org_mmcm",
  }, "ip");
  const owner = getActorByEmail(db, "mmcm.admin@plasticycle.app");
  const invite = createCoordinatorInvite(db, owner, "ip");
  redeemCoordinatorInvite(db, getActorByEmail(db, "ada.invite@example.com"), invite.code.toLowerCase(), "ip");
  const promoted = getActorByEmail(db, "ada.invite@example.com");
  assert.equal(promoted.role, "org_admin");
  assert.equal(promoted.isOwner, false);

  hub(db, "ownerb@example.com", "River NGO", { organizationType: "ngo" });
  const foreign = createCoordinatorInvite(db, getActorByEmail(db, "ownerb@example.com"), "ip");
  registerViewer(db, {
    name: "Ben Cruz",
    email: "ben.invite@example.com",
    password: "Viewer!Pass1",
    organizationId: "org_mmcm",
  }, "ip");
  assert.throws(
    () => redeemCoordinatorInvite(db, getActorByEmail(db, "ben.invite@example.com"), foreign.code, "ip"),
    (error) => error instanceof ActionError && error.status === 403,
  );
});

test("an expired invite code is refused", () => {
  const db = database();
  registerViewer(db, {
    name: "Cara Cruz",
    email: "cara.invite@example.com",
    password: "Viewer!Pass1",
    organizationId: "org_mmcm",
  }, "ip");
  const invite = createCoordinatorInvite(db, getActorByEmail(db, "mmcm.admin@plasticycle.app"), "ip");
  db.prepare("UPDATE coordinator_invites SET expires_at = ?").run("2000-01-01T00:00:00.000Z");
  assert.throws(
    () => redeemCoordinatorInvite(db, getActorByEmail(db, "cara.invite@example.com"), invite.code, "ip"),
    (error) => error instanceof ActionError && error.status === 400,
  );
});

test("a viewer request is approved only by the super admin", () => {
  const db = database();
  registerViewer(db, {
    name: "Dina Cruz",
    email: "dina.request@example.com",
    password: "Viewer!Pass1",
    organizationId: "org_san_antonio",
  }, "ip");
  const viewer = getActorByEmail(db, "dina.request@example.com");
  requestAdminRights(db, viewer, "ip");
  assert.throws(
    () => listRoleRequests(db, viewer),
    (error) => error instanceof ActionError && error.status === 403,
  );
  const owner = getActorByEmail(db, "antonio.admin@plasticycle.app");
  const pending = listRoleRequests(db, owner);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].email, "dina.request@example.com");
  reviewRoleRequest(db, owner, pending[0].id, "approve", "ip");
  const promoted = getActorByEmail(db, "dina.request@example.com");
  assert.equal(promoted.role, "org_admin");
  assert.equal(promoted.isOwner, false);
});

test("a hub can tighten the kilograms accepted on one weigh-in", () => {
  const db = database();
  const admin = getActorByEmail(db, "mmcm.admin@plasticycle.app");
  const created = createCompetition(db, admin, {
    name: "Limit Cup",
    kind: "campus",
    startsOn: "2026-01-01",
    endsOn: "2026-12-31",
    participants: ["Library", "Clinic"],
  }, "ip");
  db.prepare("UPDATE organizations SET max_kilos = 1 WHERE id = ?").run(admin.organizationId);
  const unit = db.prepare("SELECT unit_id FROM competition_participants WHERE competition_id = ?").get(created.id);
  assert.throws(
    () => createCollection(db, getActorByEmail(db, "mmcm.weigh@plasticycle.app"), {
      competitionId: created.id,
      unitId: unit.unit_id,
      kilos: "2",
    }, "ip"),
    (error) => error instanceof ActionError && error.status === 400,
  );
});

test("joining a real hub waits for an admin, and sample hubs stay off the public list", () => {
  const db = database();
  assert.equal(listPublicOrganizations(db).some((org) => org.name === "Barangay San Antonio"), false);
  hub(db, "owner.mintal@example.com", "Barangay Mintal Test");
  assert.equal(listPublicOrganizations(db).some((org) => org.name === "Barangay Mintal Test"), true);
  const org = db.prepare("SELECT id FROM organizations WHERE name = ?").get("Barangay Mintal Test");
  assert.throws(
    () => registerViewer(db, {
      name: "Sample Person",
      email: "sample.join@example.com",
      password: "Viewer!Pass1",
      organizationId: "org_mmcm",
      awaitingApproval: true,
    }, "ip"),
    (error) => error instanceof ActionError && error.status === 400,
  );
  const result = registerViewer(db, {
    name: "Paolo Reyes",
    email: "paolo.join@example.com",
    password: "Viewer!Pass1",
    organizationId: org.id,
    awaitingApproval: true,
  }, "ip");
  assert.equal(result.user.role, "viewer");
  assert.equal(result.user.joinStatus, "pending");
  const owner = getActorByEmail(db, "owner.mintal@example.com");
  const waiting = listJoinRequests(db, owner);
  assert.equal(waiting[0].email, "paolo.join@example.com");
  reviewJoinRequest(db, owner, waiting[0].id, "approve", "ip");
  assert.equal(getActorByEmail(db, "paolo.join@example.com").joinStatus, "active");
});
