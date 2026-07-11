import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("otp_countries").select("*").order("name");
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ countries: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const body = await request.json();
  if (!body.country || !body.name) {
    return NextResponse.json({ message: "Country and name required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("otp_countries")
    .insert({
      country: body.country.toLowerCase(),
      name: body.name,
      is_eu: !!body.is_eu,
      min_profit: body.min_profit ?? 500,
      max_profit: body.max_profit ?? 3000,
      enabled: body.enabled !== false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ country: data });
}
