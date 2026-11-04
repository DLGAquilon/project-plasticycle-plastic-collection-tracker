import { loginUser } from "../../../../lib/actions.js";
import { getDb } from "../../../../lib/db.js";
import { assertOrigin, readBody, rejected, requestIpHash, withSession } from "../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const body = await readBody(request);
    const result = loginUser(getDb(), {
      email: body?.email,
      password: body?.password,
      ipHash: requestIpHash(request),
    });
    return withSession({ user: result.user }, result.token);
  } catch (error) {
    return rejected(error);
  }
}
