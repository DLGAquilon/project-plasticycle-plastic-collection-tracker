import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db.js";
import { json, rejected, requireActor } from "../../../../lib/http.js";
import { readHubLogo } from "../../../../lib/onboarding.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const actor = await requireActor();
    const logo = readHubLogo(getDb(), actor);
    if (!logo) return json({ error: "This organization has no logo yet." }, 404);
    return new NextResponse(logo.bytes, {
      headers: {
        "Content-Type": logo.type,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return rejected(error);
  }
}
