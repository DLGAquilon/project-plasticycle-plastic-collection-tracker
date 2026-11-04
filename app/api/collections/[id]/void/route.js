import { voidCollection } from "../../../../../lib/actions.js";
import { getDb } from "../../../../../lib/db.js";
import { assertOrigin, readBody, rejected, requestIpHash, requireActor } from "../../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const { id } = await params;
    const body = await readBody(request);
    voidCollection(getDb(), actor, id, body, requestIpHash(request));
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return rejected(error);
  }
}
