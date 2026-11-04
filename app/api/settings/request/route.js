import { getDb } from "../../../../lib/db.js";
import { assertOrigin, json, rejected, requestIpHash, requireActor } from "../../../../lib/http.js";
import { requestAdminRights } from "../../../../lib/onboarding.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const created = requestAdminRights(getDb(), actor, requestIpHash(request));
    return json(created, 201);
  } catch (error) {
    return rejected(error);
  }
}
