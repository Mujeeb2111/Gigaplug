import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import { fetchDataPlans } from "@/lib/services/clubkonnect";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("data_plans").select("*").order("network").order("sell_price");
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ plans: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const supabase = getSupabaseServerClient();
  const body = await request.json();

  if (body.sync) {
    try {
      const livePlans = await fetchDataPlans();
      for (const plan of livePlans) {
        const markup = 20;
        await supabase.from("data_plans").upsert(
          {
            network: plan.network,
            plan_code: plan.planCode,
            name: plan.name,
            cost_price: plan.apiCost,
            sell_price: plan.apiCost + markup,
            enabled: true,
          },
          { onConflict: "network,plan_code" }
        );
      }
      return NextResponse.json({ success: true, synced: livePlans.length });
    } catch (err: any) {
      return NextResponse.json({ message: err.message || "Sync failed" }, { status: 500 });
    }
  }

  if (!body.network || !body.plan_code || !body.name || body.cost_price === undefined || body.sell_price === undefined) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }

  if (body.sell_price < body.cost_price + 20) {
    return NextResponse.json({ message: "Sell price must be at least cost price + ₦20" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("data_plans")
    .insert({
      network: body.network,
      plan_code: body.plan_code,
      name: body.name,
      cost_price: Number(body.cost_price),
      sell_price: Number(body.sell_price),
      enabled: body.enabled !== false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ plan: data });
}
