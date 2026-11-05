import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { loginWithVerifiedEmail } from "../../../../../lib/actions.js";
import { getDb } from "../../../../../lib/db.js";
import { ActionError } from "../../../../../lib/errors.js";
import { googleEmailFromCode, safeEqual } from "../../../../../lib/google.js";
import { applyCookie, requestIpHash, SESSION_COOKIE } from "../../../../../lib/http.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SESSION_MAX_AGE = 60 * 60 * 12;

function destination(user) {
  if (user?.joinStatus === "pending" || user?.joinStatus === "declined") return "/pending";
  if (user?.isOwner && user?.setupComplete === false) return "/setup";
  return "/console";
}

function failTo(request, notice) {
  const response = NextResponse.redirect(new URL(`/login?notice=${notice}`, request.url));
  applyCookie(response, "pc_google", "", 0);
  return response;
}

export async function GET(request) {
  const googleError = request.nextUrl.searchParams.get("error");
  if (googleError === "access_denied") return failTo(request, "denied");
  if (googleError) return failTo(request, "failed");

  const code = request.nextUrl.searchParams.get("code") || "";
  const state = request.nextUrl.searchParams.get("state") || "";
  const jar = await cookies();
  const stored = jar.get("pc_google")?.value || "";
  const split = stored.indexOf(".");
  const storedState = split > 0 ? stored.slice(0, split) : "";
  const verifier = split > 0 ? stored.slice(split + 1) : "";
  if (!code || !verifier || !safeEqual(state, storedState)) return failTo(request, "failed");

  const redirectUri = new URL("/api/auth/google/callback", request.nextUrl.origin).toString();
  let email = null;
  try {
    email = await googleEmailFromCode({ code, redirectUri, verifier });
  } catch {
    return failTo(request, "failed");
  }
  if (!email) return failTo(request, "failed");

  try {
    const result = loginWithVerifiedEmail(getDb(), { email, ipHash: requestIpHash(request) });
    const response = NextResponse.redirect(new URL(destination(result.user), request.url));
    applyCookie(response, SESSION_COOKIE, result.token, SESSION_MAX_AGE);
    applyCookie(response, "pc_google", "", 0);
    return response;
  } catch (error) {
    if (error instanceof ActionError && error.status === 403) return failTo(request, "inactive");
    if (error instanceof ActionError && error.status === 401) {
      const response = NextResponse.redirect(
        new URL(`/login?notice=missing&email=${encodeURIComponent(email)}`, request.url),
      );
      applyCookie(response, "pc_google", "", 0);
      return response;
    }
    return failTo(request, "failed");
  }
}
