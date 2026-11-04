import { getDb } from "../../../lib/db.js";
import { assertOrigin, json, readBody, rejected, requestIpHash, requireActor } from "../../../lib/http.js";
import { hubSetup, saveHubSetup } from "../../../lib/onboarding.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await requireActor();
    return json(hubSetup(getDb(), actor));
  } catch (error) {
    return rejected(error);
  }
}

export async function POST(request) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const saved = saveHubSetup(getDb(), actor, await readBody(request), requestIpHash(request));
    return json(saved);
  } catch (error) {
    return rejected(error);
  }
}
