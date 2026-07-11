import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import { generateReference } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const { user_id, amount, type, reason } = await request.json();
  if (!user_id || !amount || !type || !["credit", "debit"].includes(type)) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const numericAmount = Number(amount);

  if (type === "credit") {
    await supabase.rpc("credit_wallet", {
      p_user_id: user_id,
      p_amount: numericAmount,
      p_reference: generateReference("admin"),
      p_description: `Manual credit: ${reason || "admin adjustment"}`,
    });
    await supabase.from("transactions").update({ type: "manual_credit" }).eq("reference", generateReference("admin"));
  } else {
    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user_id).single();
    if ((wallet?.balance || 0) < numericAmount) {
      return NextResponse.json({ message: "Insufficient balance" }, { status: 400 });
    }
    const ref = generateReference("admin");
    await supabase.rpc("debit_wallet", {
      p_user_id: user_id,
      p_amount: numericAmount,
      p_reference: ref,
      p_description: `Manual debit: ${reason || "admin adjustment"}`,
      p_type: "manual_debit",
    });
  }

  return NextResponse.json({ success: true });
}
