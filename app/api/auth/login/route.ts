import { NextRequest, NextResponse } from "next/server";
import { setSession } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import { generateOtp, normalizeEmail } from "@/lib/utils";
import { sendOtpEmail } from "@/lib/services/brevo";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = normalizeEmail(email || "");

    if (!normalizedEmail) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Admin login
    const adminEmail = process.env.GIGAPLUG_ADMIN_EMAIL;
    const adminPassword = process.env.GIGAPLUG_ADMIN_PASSWORD;
    if (
      adminEmail &&
      adminPassword &&
      normalizeEmail(adminEmail) === normalizedEmail &&
      password === adminPassword
    ) {
      const response = NextResponse.json({ role: "admin" });
      await setSession(response, { id: "admin", email: normalizedEmail, role: "admin" });
      return response;
    }

    // Admin mode requires password match
    if (password) {
      return NextResponse.json({ message: "Invalid admin credentials" }, { status: 401 });
    }

    // User login: generate OTP
    const supabase = getSupabaseServerClient();
    const { data: existing } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("email", normalizedEmail)
      .single();

    let userId = existing?.id;
    if (!existing) {
      const { data: created, error } = await supabase
        .from("users")
        .insert({ email: normalizedEmail, role: "user" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      userId = created.id;
      await supabase.from("wallets").insert({ user_id: userId, balance: 0 });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const { error: updateError } = await supabase
      .from("users")
      .update({ otp_code: otp, otp_expires_at: expiresAt.toISOString(), otp_used: false })
      .eq("id", userId);
    if (updateError) throw new Error(updateError.message);

    await sendOtpEmail(normalizedEmail, otp, existing?.full_name || undefined);

    return NextResponse.json({ role: "user", message: "OTP sent" });
  } catch (err: any) {
    console.error("login error", err);
    return NextResponse.json(
      { message: err.message || "Unable to send login code" },
      { status: 500 }
    );
  }
}
