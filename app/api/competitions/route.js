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
      },
      canAdd: actor.role === "org_admin" || actor.role === "platform_admin",
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
