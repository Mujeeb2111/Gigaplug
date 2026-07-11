import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const { id } = await params;
  const body = await request.json();

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("otp_countries")
    .update({
      name: body.name,
      is_eu: body.is_eu,
      min_profit: body.min_profit,
      max_profit: body.max_profit,
      enabled: body.enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ country: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("otp_countries").delete().eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
