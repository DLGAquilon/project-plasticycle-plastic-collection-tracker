import { createSeason, joinSeason } from "../../../../lib/actions.js";
import { getDb } from "../../../../lib/db.js";
import { assertOrigin, json, readBody, rejected, requestIpHash, requireActor } from "../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const body = await readBody(request);
    const db = getDb();
    const ipHash = requestIpHash(request);
    if (body?.intent === "join") {
      joinSeason(db, actor, body, ipHash);
      return json({ ok: true });
    }
    const season = createSeason(db, actor, body, ipHash);
    return json(season, 201);
  } catch (error) {
    return rejected(error);
  }
}
