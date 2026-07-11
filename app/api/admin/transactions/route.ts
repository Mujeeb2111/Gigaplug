import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || "200"), 500);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, users(email, full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ transactions: data });
}
