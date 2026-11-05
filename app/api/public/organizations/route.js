import { listPublicOrganizations } from "../../../../lib/actions.js";
import { getDb } from "../../../../lib/db.js";
import { json, rejected } from "../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    const query = new URL(request.url).searchParams.get("q") || "";
    return json({ organizations: listPublicOrganizations(getDb(), { query }) });
  } catch (error) {
    return rejected(error);
  }
}
