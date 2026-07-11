import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || "100"), 500);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("*, wallets(balance), virtual_accounts(account_number, bank_name, account_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const users = (data || []).map((u: any) => ({
    ...u,
    walletBalance: u.wallets?.balance || 0,
    virtualAccount: u.virtual_accounts,
    wallets: undefined,
    virtual_accounts: undefined,
  }));

  return NextResponse.json({ users });
}
