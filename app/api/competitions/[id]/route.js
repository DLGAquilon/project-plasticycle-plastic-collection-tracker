import { competitionRoom } from "../../../../lib/competitions.js";
import { getDb } from "../../../../lib/db.js";
import { json, rejected, requireActor } from "../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const actor = await requireActor();
    const { id } = await params;
    return json(competitionRoom(getDb(), actor, id));
  } catch (error) {
    return rejected(error);
  }
}
