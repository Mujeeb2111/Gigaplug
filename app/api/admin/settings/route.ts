import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminConfig, setAdminConfig } from "@/lib/admin-config";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const config = await getAdminConfig();
  return NextResponse.json({ config });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const body = await request.json();
  if (body.otp_tiers) await setAdminConfig("otp_tiers", body.otp_tiers);
  if (body.fx_rate !== undefined) await setAdminConfig("fx_rate", Number(body.fx_rate));
  if (body.data_markup !== undefined) await setAdminConfig("data_markup", Number(body.data_markup));

  const config = await getAdminConfig();
  return NextResponse.json({ config });
}
