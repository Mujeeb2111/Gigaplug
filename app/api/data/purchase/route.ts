import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import { purchaseData } from "@/lib/services/clubkonnect";
import { generateReference } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { planId, phone } = await request.json();
  if (!planId || !phone) {
    return NextResponse.json({ message: "Plan and phone required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data: plan, error: planError } = await supabase
    .from("data_plans")
    .select("*")
    .eq("id", planId)
    .single();
  if (planError || !plan) {
    return NextResponse.json({ message: "Plan not found" }, { status: 404 });
  }

  if (plan.sell_price < plan.cost_price + 20) {
    return NextResponse.json({ message: "Price configuration error" }, { status: 400 });
  }

  const reference = generateReference("data");
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", session.id)
    .single();

  if ((wallet?.balance || 0) < plan.sell_price) {
    return NextResponse.json({ message: "Insufficient wallet balance" }, { status: 400 });
  }

  const { success: debitSuccess } = await supabase.rpc("debit_wallet", {
    p_user_id: session.id,
    p_amount: plan.sell_price,
    p_reference: reference,
    p_description: `Data purchase: ${plan.name} for ${phone}`,
    p_type: "data",
  });

  if (!debitSuccess) {
    return NextResponse.json({ message: "Insufficient wallet balance" }, { status: 400 });
  }

  // Insert pending order
  const { data: order, error: orderError } = await supabase
    .from("data_orders")
    .insert({
      user_id: session.id,
      network: plan.network,
      plan_code: plan.plan_code,
      plan_name: plan.name,
      phone,
      cost_price: plan.cost_price,
      sell_price: plan.sell_price,
      reference,
      status: "pending",
    })
    .select()
    .single();
  if (orderError) throw orderError;

  try {
    const result = await purchaseData({
      network: plan.network,
      planCode: plan.plan_code,
      phone,
      requestId: reference,
    });
    const status = result.success ? "success" : "failed";
    await supabase
      .from("data_orders")
      .update({ status, metadata: result.raw })
      .eq("id", order.id);

    if (result.success) {
      await supabase
        .from("transactions")
        .update({ cost_price: plan.cost_price, profit: plan.sell_price - plan.cost_price })
        .eq("reference", reference);
      return NextResponse.json({ success: true, order: { ...order, status, metadata: result.raw } });
    }

    // Refund if failed
    await supabase.rpc("credit_wallet", {
      p_user_id: session.id,
      p_amount: plan.sell_price,
      p_reference: generateReference("refund"),
      p_description: `Refund for failed data: ${plan.name}`,
    });
    return NextResponse.json({ success: false, message: "Data purchase failed and refunded" }, { status: 500 });
  } catch (err: any) {
    console.error("Data purchase error", err);
    await supabase.from("data_orders").update({ status: "failed", metadata: err }).eq("id", order.id);
    await supabase.rpc("credit_wallet", {
      p_user_id: session.id,
      p_amount: plan.sell_price,
      p_reference: generateReference("refund"),
      p_description: `Refund for failed data: ${plan.name}`,
    });
    return NextResponse.json({ message: err.message || "Purchase failed" }, { status: 500 });
  }
}
