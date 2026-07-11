import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("otp_orders")
    .select("*")
    .eq("user_id", session.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ orders: data });
}
