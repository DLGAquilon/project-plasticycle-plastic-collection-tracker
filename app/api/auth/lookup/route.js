import { lookupAccount } from "../../../../lib/actions.js";
import { getDb } from "../../../../lib/db.js";
import { assertOrigin, json, readBody, rejected } from "../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    assertOrigin(request);
    const body = await readBody(request);
    return json(lookupAccount(getDb(), body?.email));
  } catch (error) {
    return rejected(error);
  }
}
