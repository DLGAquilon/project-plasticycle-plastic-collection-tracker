import { logoutUser } from "../../../../lib/actions.js";
import { getDb } from "../../../../lib/db.js";
import { assertOrigin, clearSession, rejected, sessionToken } from "../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    logoutUser(getDb(), await sessionToken());
    return clearSession({ ok: true });
  } catch (error) {
    return rejected(error);
  }
}
