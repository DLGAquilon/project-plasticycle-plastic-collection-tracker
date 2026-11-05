import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserBySession } from "./actions.js";
import { getDb } from "./db.js";
import { ActionError } from "./errors.js";
import { clientIp, hashIp, sameOrigin } from "./security.js";

export const SESSION_COOKIE = "pc_session";
const SESSION_MAX_AGE = 60 * 60 * 12;

export function json(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function rejected(error) {
  if (error instanceof ActionError) return json({ error: error.message }, error.status);
  console.error(error);
  return json({ error: "Something went wrong. Try again." }, 500);
}

export function assertOrigin(request) {
  if (!sameOrigin(request)) throw new ActionError(403, "The request was blocked.");
}

export async function readBody(request) {
  try {
    return await request.json();
  } catch {
    throw new ActionError(400, "The form could not be read. Try again.");
  }
}

export async function requireActor() {
  const jar = await cookies();
  const actor = getUserBySession(getDb(), jar.get(SESSION_COOKIE)?.value);
  if (!actor) throw new ActionError(401, "Sign in required.");
  return actor;
}

export async function sessionToken() {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value || "";
}

export function requestIpHash(request) {
  return hashIp(clientIp(request));
}

export function withSession(body, token) {
  const response = json(body);
  applyCookie(response, SESSION_COOKIE, token, SESSION_MAX_AGE);
  return response;
}

export function applyCookie(response, name, value, maxAge) {
  response.cookies.set(name, value, cookieOptions(maxAge));
  return response;
}

export function clearSession(body) {
  const response = json(body);
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  return response;
}

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
