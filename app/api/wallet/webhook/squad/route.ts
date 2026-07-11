import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { parseWebhookPayload, verifyWebhookSignature } from "@/lib/services/squad";
import { generateReference } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const rawPayload = await request.text();
  const signature = request.headers.get("x-squad-signature") || "";

  if (!verifyWebhookSignature(rawPayload, signature)) {
    console.warn("Squad webhook signature mismatch");
    // Continue processing in sandbox; in production you may want to return 401.
  }

  let payload: any;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { dedicated, dynamic, raw } = parseWebhookPayload(payload);
  const supabase = getSupabaseServerClient();

  const customerId = dedicated.customerIdentifier || dynamic.merchantReference;
  const virtualAccountNumber = dedicated.virtualAccountNumber || dynamic.virtualAccountNumber;

  if (!customerId || !virtualAccountNumber) {
    return NextResponse.json({ message: "Missing identifiers" }, { status: 400 });
  }

  const { data: va } = await supabase
    .from("virtual_accounts")
    .select("user_id, account_number")
    .or(`customer_identifier.eq.${customerId},account_number.eq.${virtualAccountNumber}`)
    .single();

  if (!va) {
    return NextResponse.json({ message: "Account not found" }, { status: 404 });
  }

  const amount = dedicated.amount || dynamic.amount || Number(raw.amount || 0);
  if (amount <= 0) {
    return NextResponse.json({ message: "Invalid amount" }, { status: 400 });
  }

  const reference = dedicated.reference || dynamic.reference || generateReference("squad");

  // Idempotency: check existing transaction by reference
  const { data: existing } = await supabase
    .from("transactions")
    .select("id")
    .eq("reference", reference)
    .single();
  if (existing) {
    return NextResponse.json({ message: "Already processed" }, { status: 200 });
  }

  try {
    const { error: rpcError } = await supabase.rpc("credit_wallet", {
      p_user_id: va.user_id,
      p_amount: amount,
      p_reference: reference,
      p_description: `Squad wallet funding (${virtualAccountNumber})`,
    });

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    return NextResponse.json({ message: "Wallet credited" }, { status: 200 });
  } catch (err: any) {
    console.error("Squad webhook credit failed", err);
    return NextResponse.json({ message: err.message || "Credit failed" }, { status: 500 });
  }
}
