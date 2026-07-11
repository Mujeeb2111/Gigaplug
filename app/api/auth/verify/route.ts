import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/utils";
import { createVirtualAccount } from "@/lib/services/squad";

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();
    const normalizedEmail = normalizeEmail(email || "");
    if (!normalizedEmail || !otp) {
      return NextResponse.json({ message: "Email and OTP are required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, full_name, otp_code, otp_expires_at, otp_used")
      .eq("email", normalizedEmail)
      .single();
    if (error || !user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (
      user.otp_used ||
      user.otp_code !== otp.toString() ||
      new Date(user.otp_expires_at) < new Date()
    ) {
      return NextResponse.json({ message: "Invalid or expired code" }, { status: 401 });
    }

    await supabase.from("users").update({ otp_used: true }).eq("id", user.id);

    // Ensure virtual account exists
    const { data: existingVa } = await supabase
      .from("virtual_accounts")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!existingVa) {
      try {
        const res = await createVirtualAccount({ userId: user.id, email: normalizedEmail });
        const data = res?.data || res || {};
        await supabase.from("virtual_accounts").insert({
          user_id: user.id,
          account_number: data.virtual_account_number || data.account_number || data.va_number || "",
          bank_name: data.bank_name || "Squad",
          account_name: data.business_name || data.account_name || `Gigaplug ${normalizedEmail}`,
          customer_identifier: data.customer_identifier || user.id,
          reference: data.transaction_reference || data.ref || data.id || null,
          raw: data,
        });
      } catch (vaErr: any) {
        console.error("Virtual account creation failed", vaErr);
      }
    }

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, fullName: user.full_name },
    });
    await setSession(response, {
      id: user.id,
      email: user.email,
      role: "user",
      name: user.full_name,
    });
    return response;
  } catch (err: any) {
    console.error("verify error", err);
    return NextResponse.json({ message: err.message || "Verification failed" }, { status: 500 });
  }
}
