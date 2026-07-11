import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("data_plans")
    .select("*")
    .eq("enabled", true)
    .order("network")
    .order("sell_price");
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ plans: data });
}
