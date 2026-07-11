import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("otp_countries")
    .select("*")
    .eq("enabled", true)
    .order("name");
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ countries: data });
}
