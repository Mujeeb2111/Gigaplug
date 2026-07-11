import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const { id } = await params;
  const body = await request.json();

  if (body.sell_price !== undefined && body.cost_price !== undefined) {
    if (body.sell_price < body.cost_price + 20) {
      return NextResponse.json({ message: "Sell price must be at least cost price + ₦20" }, { status: 400 });
    }
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("data_plans")
    .update({
      network: body.network,
      plan_code: body.plan_code,
      name: body.name,
      cost_price: body.cost_price !== undefined ? Number(body.cost_price) : undefined,
      sell_price: body.sell_price !== undefined ? Number(body.sell_price) : undefined,
      enabled: body.enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ plan: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("data_plans").delete().eq("id", id);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
