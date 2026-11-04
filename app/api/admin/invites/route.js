import { getDb } from "../../../../lib/db.js";
import { assertOrigin, json, rejected, requestIpHash, requireActor } from "../../../../lib/http.js";
import { createCoordinatorInvite } from "../../../../lib/onboarding.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const invite = createCoordinatorInvite(getDb(), actor, requestIpHash(request));
    return json(invite, 201);
  } catch (error) {
    return rejected(error);
  }
}
