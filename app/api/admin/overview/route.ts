import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const supabase = getSupabaseServerClient();
  const [users, transactions, dataOrders, otpOrders] = await Promise.all([
    supabase.from("users").select("id", { count: "exact" }),
    supabase.from("transactions").select("*"),
    supabase.from("data_orders").select("*"),
    supabase.from("otp_orders").select("*"),
  ]);

  const totalProfit = (transactions.data || []).reduce((sum: number, t: any) => sum + (Number(t.profit) || 0), 0);
  const totalRevenue = (transactions.data || []).reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

  return NextResponse.json({
    userCount: users.count || 0,
    transactionCount: transactions.data?.length || 0,
    totalProfit,
    totalRevenue,
    dataOrderCount: dataOrders.data?.length || 0,
    otpOrderCount: otpOrders.data?.length || 0,
  });
}
