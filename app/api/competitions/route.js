import { listPublicOrganizations } from "../../../lib/actions.js";
import { createCompetition, listCompetitions } from "../../../lib/competitions.js";
import { getDb } from "../../../lib/db.js";
import { assertOrigin, json, readBody, rejected, requestIpHash, requireActor } from "../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await requireActor();
    const competitions = listCompetitions(getDb(), actor);
    return json({
      user: {
        id: actor.id,
        name: actor.name,
        role: actor.role,
        organizationName: actor.organizationName,
        isOwner: actor.isOwner,
        setupComplete: actor.setupComplete,
        needsSetup: Boolean(actor.isOwner) && actor.setupComplete === false,
      },
      canAdd: actor.role === "org_admin" || actor.role === "platform_admin",
      canInvite: actor.role === "org_admin" || actor.role === "platform_admin",
      organizations: actor.role === "platform_admin" ? listPublicOrganizations(getDb()) : [],
      competitions,
    });
  } catch (error) {
    return rejected(error);
  }
}

export async function POST(request) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const created = createCompetition(getDb(), actor, await readBody(request), requestIpHash(request));
    return json(created, 201);
  } catch (error) {
    return rejected(error);
  }
}
