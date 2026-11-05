import { checkSupabase } from "../../../../lib/supabase.js";
import { json } from "../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await checkSupabase();
  const status = result.ok ? 200 : result.status === "missing" ? 503 : 502;
  return json({ ok: result.ok, status: result.status }, status);
}
