import { registerViewer } from "../../../../lib/actions.js";
import { getDb } from "../../../../lib/db.js";
import { assertOrigin, readBody, rejected, requestIpHash, withSession } from "../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const result = registerViewer(getDb(), await readBody(request), requestIpHash(request));
    return withSession({ user: result.user }, result.token);
  } catch (error) {
    return rejected(error);
  }
}
