import { getDb } from "../../../../lib/db.js";
import { assertOrigin, json, rejected, requestIpHash, requireActor } from "../../../../lib/http.js";
import { saveHubLogo } from "../../../../lib/onboarding.js";
import { fail } from "../../../../lib/errors.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const actor = await requireActor();
    const form = await request.formData();
    const file = form.get("logo");
    if (!file || typeof file.arrayBuffer !== "function") fail(400, "Choose a logo file.");
    const saved = saveHubLogo(getDb(), actor, {
      type: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    }, requestIpHash(request));
    return json(saved);
  } catch (error) {
    return rejected(error);
  }
}
