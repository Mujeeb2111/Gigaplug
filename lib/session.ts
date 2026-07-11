import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { sealData, unsealData } from "iron-session";

export const SESSION_COOKIE = "gigaplug_session";

export type SessionUser = {
  id: string;
  email: string;
  role: "user" | "admin";
  name?: string;
};

export type SessionData = {
  user: SessionUser;
  expiresAt: number;
};

const FALLBACK_SECRET = "GIGAPLUG_SESSION_SECRET_REPLACE_IN_PRODUCTION_ENV";

function getSecret() {
  const secret = process.env.SESSION_SECRET || process.env.IRON_SESSION_PASSWORD;
  if (!secret) {
    return FALLBACK_SECRET;
  }
  return secret;
}

const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function getSession() {
  const c = await cookies();
  const value = c.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const data = (await unsealData<SessionData>(value, {
      password: getSecret(),
      ttl: TTL_SECONDS,
    })) as SessionData;
    if (!data?.user || Date.now() > data.expiresAt) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: NextRequest) {
  const value = req.cookies.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const data = (await unsealData<SessionData>(value, {
      password: getSecret(),
      ttl: TTL_SECONDS,
    })) as SessionData;
    if (!data?.user || Date.now() > data.expiresAt) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function setSession(response: NextResponse, user: SessionUser) {
  const sealed = await sealData(
    { user, expiresAt: Date.now() + TTL_SECONDS * 1000 } as SessionData,
    { password: getSecret(), ttl: TTL_SECONDS }
  );
  response.cookies.set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
