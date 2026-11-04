import { getDb } from "../../../../lib/db.js";
import { assertOrigin, json, readBody, rejected, requestIpHash, requireActor } from "../../../../lib/http.js";
import { redeemCoordinatorInvite } from "../../../../lib/onboarding.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const body = await readBody(request);
    const result = redeemCoordinatorInvite(getDb(), actor, body?.code, requestIpHash(request));
    return json(result);
  } catch (error) {
    return rejected(error);
  }
}
