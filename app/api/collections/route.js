import { createCollection } from "../../../lib/actions.js";
import { getDb } from "../../../lib/db.js";
import { assertOrigin, readBody, rejected, requestIpHash, requireActor } from "../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const body = await readBody(request);
    const receipt = createCollection(getDb(), actor, body, requestIpHash(request));
    return Response.json(receipt, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return rejected(error);
  }
}
