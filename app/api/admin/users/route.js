import { createMember } from "../../../../lib/actions.js";
import { getDb } from "../../../../lib/db.js";
import { assertOrigin, json, readBody, rejected, requestIpHash, requireActor } from "../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const body = await readBody(request);
    const member = createMember(getDb(), actor, body, requestIpHash(request));
    return json(member, 201);
  } catch (error) {
    return rejected(error);
  }
}
