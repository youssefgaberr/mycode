import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Minimal admin auth: one password (ADMIN_PASSWORD) → a signed, expiring,
 * httpOnly cookie. Changing ADMIN_PASSWORD logs everyone out.
 */
const COOKIE = "bp_admin";
const MAX_AGE_S = 60 * 60 * 12; // 12 hours

function secret(): Buffer | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 8) return null;
  return createHash("sha256").update(`brightpan-admin:${pw}`).digest();
}

const sign = (key: Buffer, payload: string) => createHmac("sha256", key).update(payload).digest("base64url");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkPassword(given: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || pw.length < 8) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(pw).digest();
  return timingSafeEqual(a, b);
}

export function createSessionToken(now = Date.now()): string | null {
  const key = secret();
  if (!key) return null;
  const exp = String(Math.floor(now / 1000) + MAX_AGE_S);
  return `${exp}.${sign(key, exp)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()): boolean {
  const key = secret();
  if (!key || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !safeEqual(sig, sign(key, exp))) return false;
  return Number(exp) * 1000 > now;
}

export async function startAdminSession() {
  const token = createSessionToken();
  if (!token) throw new Error("ADMIN_PASSWORD is not set (min. 8 characters).");
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: MAX_AGE_S,
  });
}

export async function endAdminSession() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
}

export async function isAdmin(): Promise<boolean> {
  return verifySessionToken((await cookies()).get(COOKIE)?.value);
}

/** Call at the top of every admin page and server action. */
export async function requireAdmin() {
  // Admin pages are always rendered per request (they read the clock and live data).
  await connection();
  if (!(await isAdmin())) redirect("/admin/login");
}
