import { getDb } from "../../../../lib/db.js";
import { json, rejected } from "../../../../lib/http.js";
import { clientIp } from "../../../../lib/security.js";
import { publicLeaderboard } from "../../../../lib/workspace.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const hits = new Map();

export async function GET(request) {
  try {
    const ip = clientIp(request);
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((stamp) => now - stamp < 60_000);
    if (recent.length >= 60) return json({ error: "Too many requests. Try again in a minute." }, 429);
    recent.push(now);
    hits.set(ip, recent);
    return json(publicLeaderboard(getDb()));
  } catch (error) {
    return rejected(error);
  }
}
