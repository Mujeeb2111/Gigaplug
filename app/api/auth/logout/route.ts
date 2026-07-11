import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function GET() {
  const response = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
  await clearSession(response);
  return response;
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  await clearSession(response);
  return response;
}
