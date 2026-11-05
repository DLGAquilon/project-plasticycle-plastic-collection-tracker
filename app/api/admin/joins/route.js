import { getDb } from "../../../../lib/db.js";
import { assertOrigin, json, readBody, rejected, requestIpHash, requireActor } from "../../../../lib/http.js";
import { listJoinRequests, reviewJoinRequest } from "../../../../lib/onboarding.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await requireActor();
    return json({ requests: listJoinRequests(getDb(), actor) });
  } catch (error) {
    return rejected(error);
  }
}

export async function POST(request) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const body = await readBody(request);
    const reviewed = reviewJoinRequest(getDb(), actor, body?.id, body?.decision, requestIpHash(request));
    return json(reviewed);
  } catch (error) {
    return rejected(error);
  }
}
