import { loginUser, registerViewer } from "../../../../lib/actions.js";
import { getDb } from "../../../../lib/db.js";
import { assertOrigin, readBody, rejected, requestIpHash, withSession } from "../../../../lib/http.js";
import { registerOrganization } from "../../../../lib/onboarding.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const body = await readBody(request);
    const db = getDb();
    const ipHash = requestIpHash(request);
    if (body?.mode === "create") {
      const created = registerOrganization(db, body, ipHash);
      const result = loginUser(db, { email: created.email, password: body?.password, ipHash });
      return withSession({ user: result.user, next: "/console" }, result.token);
    }
    const result = registerViewer(db, { ...body, awaitingApproval: true }, ipHash);
    return withSession({ user: result.user, next: "/pending" }, result.token);
  } catch (error) {
    return rejected(error);
  }
}
