import { deactivateMember } from "../../../../../../lib/actions.js";
import { getDb } from "../../../../../../lib/db.js";
import { assertOrigin, json, rejected, requestIpHash, requireActor } from "../../../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const { id } = await params;
    deactivateMember(getDb(), actor, id, requestIpHash(request));
    return json({ ok: true });
  } catch (error) {
    return rejected(error);
  }
}
