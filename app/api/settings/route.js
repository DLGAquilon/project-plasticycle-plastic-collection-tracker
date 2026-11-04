import { getDb } from "../../../lib/db.js";
import { json, rejected, requireActor } from "../../../lib/http.js";
import { settingsSnapshot } from "../../../lib/onboarding.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await requireActor();
    return json(settingsSnapshot(getDb(), actor));
  } catch (error) {
    return rejected(error);
  }
}
