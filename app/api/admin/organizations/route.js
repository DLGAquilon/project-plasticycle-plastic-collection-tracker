import { createOrganization } from "../../../../lib/actions.js";
import { getDb } from "../../../../lib/db.js";
import { assertOrigin, json, readBody, rejected, requestIpHash, requireActor } from "../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const org = createOrganization(getDb(), actor, await readBody(request), requestIpHash(request));
    return json(org, 201);
  } catch (error) {
    return rejected(error);
  }
}
