import { createUnit } from "../../../../lib/actions.js";
import { getDb } from "../../../../lib/db.js";
import { assertOrigin, json, readBody, rejected, requestIpHash, requireActor } from "../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const unit = createUnit(getDb(), actor, await readBody(request), requestIpHash(request));
    return json(unit, 201);
  } catch (error) {
    return rejected(error);
  }
}
