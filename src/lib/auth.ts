import crypto from "crypto";
import { cookies } from "next/headers";
import type { SessionUser } from "./types";

const COOKIE_NAME = "indox_session";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set in .env (min 16 characters).");
  }
  return secret;
}

export function verifyMasterPassword(submitted: string): boolean {
  const expected = process.env.APP_MASTER_PASSWORD;
  if (!expected) throw new Error("APP_MASTER_PASSWORD is not configured in .env.");
  const a = Buffer.from(submitted, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSessionToken(user: SessionUser): string {
  const payload = { ...user, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token || !token.includes(".")) return null;
  try {
    const [encoded, sig] = token.split(".");
    const expectedSig = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
    const sigBuf = Buffer.from(sig, "utf8");
    const expectedBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      id: payload.id,
      full_name: payload.full_name,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function getSession(): SessionUser | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function setSessionCookie(user: SessionUser) {
  const token = createSessionToken(user);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function generateVerificationToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
