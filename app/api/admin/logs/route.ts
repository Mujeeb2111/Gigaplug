import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");
  const limit = Math.min(Number(searchParams.get("limit") || "200"), 500);

  const supabase = getSupabaseServerClient();
  let query = supabase.from("api_call_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  if (provider) query = query.eq("provider", provider);

  const { data, error } = await query;
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ logs: data });
}
