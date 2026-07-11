import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import { cancelOrder } from "@/lib/services/fivesim";
import { generateReference } from "@/lib/utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();

  const { data: order } = await supabase
    .from("otp_orders")
    .select("*")
    .eq("fivesim_order_id", id)
    .eq("user_id", session.id)
    .single();

  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });

  try {
    await cancelOrder(id);
    await supabase
      .from("otp_orders")
      .update({ status: "CANCELED" })
      .eq("id", order.id);

    await supabase.rpc("credit_wallet", {
      p_user_id: session.id,
      p_amount: order.sell_price,
      p_reference: generateReference("refund"),
      p_description: `Refund: canceled OTP order ${id}`,
    });

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Cancel failed" }, { status: 500 });
  }
}
