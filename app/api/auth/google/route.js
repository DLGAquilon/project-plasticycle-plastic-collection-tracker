import { NextResponse } from "next/server";
import { googleAuthorizationUrl, googleConfigured } from "../../../../lib/google.js";
import { applyCookie } from "../../../../lib/http.js";
import { newToken } from "../../../../lib/security.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?notice=google", request.url));
  }
  const state = newToken();
  const verifier = `${newToken()}${newToken()}`;
  const redirectUri = new URL("/api/auth/google/callback", request.nextUrl.origin).toString();
  const response = NextResponse.redirect(googleAuthorizationUrl({ redirectUri, state, verifier }));
  applyCookie(response, "pc_google", `${state}.${verifier}`, 600);
  return response;
}
