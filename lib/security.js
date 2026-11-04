import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

function scryptCost() {
  const cost = Number(process.env.PLASTICYCLE_SCRYPT_N || 16384);
  if (!Number.isInteger(cost) || cost < 1024 || cost > 262144) return 16384;
  return cost;
}

export function hashPassword(password) {
  const cost = scryptCost();
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64, { N: cost, r: 8, p: 1 }).toString("hex");
  return `scrypt$${cost}$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const [scheme, costText, salt, hash] = String(stored || "").split("$");
  const cost = Number(costText);
  if (scheme !== "scrypt" || !salt || !hash || !Number.isInteger(cost)) return false;
  const actual = scryptSync(String(password), salt, 64, { N: cost, r: 8, p: 1 });
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function newToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function hashIp(ip) {
  return createHash("sha256").update(`plasticycle|${ip || "unknown"}`).digest("hex").slice(0, 24);
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function validateEmail(email) {
  const value = normalizeEmail(email);
  if (value.length < 6 || value.length > 120) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 10 || value.length > 128) return "Use a password between 10 and 128 characters.";
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return "Include at least one letter and one number.";
  }
  return null;
}

export function parseKilos(input) {
  const text = typeof input === "number" && Number.isFinite(input)
    ? canonicalizeNumber(input)
    : String(input ?? "").trim();
  if (!text) return { error: "Enter the kilograms from the scale." };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    return { error: "Use a number with at most 2 decimal places, such as 12.5." };
  }
  const kilos = Number(text);
  if (kilos < 0.01 || kilos > 5000) {
    return {
      error: "Enter a weight between 0.01 and 5,000 kg. Split a larger load into separate weigh-ins.",
    };
  }
  return { kilos };
}

function canonicalizeNumber(input) {
  const rounded = Math.round(input * 100) / 100;
  if (Math.abs(input - rounded) > 1e-8) return String(input);
  return rounded.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function cleanText(input, { min = 0, max = 80 } = {}) {
  const value = String(input ?? "").replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (value.length < min || value.length > max) return null;
  return value;
}

export function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const raw = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip");
  return String(raw || "local").trim().slice(0, 64);
}

export function sameOrigin(request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const origin = request.headers.get("origin");
  if (!host || !origin) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}
