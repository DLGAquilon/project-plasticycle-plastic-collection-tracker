import { enrollViewer } from "../../../../../lib/competitions.js";
import { getDb } from "../../../../../lib/db.js";
import { assertOrigin, json, readBody, rejected, requestIpHash, requireActor } from "../../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request, { params }) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const { id } = await params;
    enrollViewer(getDb(), actor, id, await readBody(request), requestIpHash(request));
    return json({ ok: true });
  } catch (error) {
    return rejected(error);
  }
}
