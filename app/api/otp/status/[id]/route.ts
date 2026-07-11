import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import { checkOrder } from "@/lib/services/fivesim";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const live = await checkOrder(id);
    const sms = Array.isArray(live.sms) ? live.sms : live.sms ? [live.sms] : [];
    const smsCode = sms[0]?.code || null;
    const smsText = sms[0]?.text || null;

    await supabase
      .from("otp_orders")
      .update({ status: live.status || order.status, sms_code: smsCode, sms_text: smsText, metadata: live })
      .eq("id", order.id);

    return NextResponse.json({ order: { ...order, status: live.status || order.status, sms_code: smsCode, sms_text: smsText, metadata: live } });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Status check failed" }, { status: 500 });
  }
}
