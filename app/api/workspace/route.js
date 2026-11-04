import { getDb } from "../../../lib/db.js";
import { rejected, requireActor } from "../../../lib/http.js";
import { buildWorkspace } from "../../../lib/workspace.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    const actor = await requireActor();
    const url = new URL(request.url);
    const workspace = buildWorkspace(getDb(), actor, {
      seasonId: url.searchParams.get("seasonId") || undefined,
      orgId: url.searchParams.get("orgId") || undefined,
    });
    return Response.json(workspace, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return rejected(error);
  }
}
