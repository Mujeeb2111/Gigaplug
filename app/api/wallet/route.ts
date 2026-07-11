import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", session.id)
    .single();

  const { data: va } = await supabase
    .from("virtual_accounts")
    .select("account_number, bank_name, account_name")
    .eq("user_id", session.id)
    .single();

  return NextResponse.json({ balance: wallet?.balance || 0, virtualAccount: va || null });
}
