import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getPricesByCountryAndProduct, buyActivation, checkOrder } from "@/lib/services/fivesim";
import { getOtpTiers, getFxRate } from "@/lib/admin-config";
import { generateReference } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { country, product, tier } = await request.json();
  if (!country || !product || !tier) {
    return NextResponse.json({ message: "Country, product and tier required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: countryRule } = await supabase
    .from("otp_countries")
    .select("min_profit, max_profit, is_eu")
    .eq("country", country.toLowerCase())
    .single();

  const minProfit = Number(countryRule?.min_profit || 500);
  const maxProfit = Number(countryRule?.max_profit || 3000);

  const tiers = await getOtpTiers();
  const selectedTier = Number(tier);
  if (!tiers.includes(selectedTier)) {
    return NextResponse.json({ message: "Invalid tier" }, { status: 400 });
  }

  const fx = await getFxRate();

  let prices: any;
  try {
    prices = await getPricesByCountryAndProduct(country, product);
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Could not fetch live prices" }, { status: 500 });
  }

  const countryPrices = prices?.[country]?.[product] || prices?.[product]?.[country] || {};
  const operatorEntries = Object.entries(countryPrices).map(([operator, info]: [string, any]) => ({
    operator,
    cost: Number(info?.cost || info?.price || 0),
    count: Number(info?.count || 0),
    rate: Number(info?.rate || 0),
  }));

  const available = operatorEntries.filter((o) => o.count > 0 && o.cost > 0);
  if (available.length === 0) {
    return NextResponse.json({ message: "Out of Stock. Please select a higher price tier." }, { status: 404 });
  }

  // Pick the cheapest operator that satisfies the profit rule for the selected tier
  const viable = available
    .map((o) => ({ ...o, costNgn: Math.ceil(o.cost * fx), profit: selectedTier - Math.ceil(o.cost * fx) }))
    .filter((o) => o.profit >= minProfit && (countryRule?.is_eu ? o.profit <= maxProfit : true))
    .sort((a, b) => a.cost - b.cost);

  if (viable.length === 0) {
    // Determine if all tiers are out of stock
    const anyTierViable = tiers.some((t) =>
      available.some((o) => {
        const profit = t - Math.ceil(o.cost * fx);
        return profit >= minProfit && (countryRule?.is_eu ? profit <= maxProfit : true);
      })
    );
    if (!anyTierViable) {
      return NextResponse.json({ message: "Out of Stock" }, { status: 404 });
    }
    return NextResponse.json({ message: "Out of Stock. Please select a higher price tier." }, { status: 404 });
  }

  const choice = viable[0];

  const wallet = await supabase.from("wallets").select("balance").eq("user_id", session.id).single();
  if ((wallet.data?.balance || 0) < selectedTier) {
    return NextResponse.json({ message: "Insufficient wallet balance" }, { status: 400 });
  }

  // Buy the number
  let order: any;
  try {
    order = await buyActivation({ country, operator: choice.operator, product });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Number not available" }, { status: 502 });
  }

  const actualCost = Number(order.price || order.cost || choice.cost);
  const actualCostNgn = Math.ceil(actualCost * fx);
  const profit = selectedTier - actualCostNgn;

  if (profit < minProfit || (countryRule?.is_eu && profit > maxProfit)) {
    // Cancel and refund if the profit rule cannot be met
    try {
      await cancelOrder(order.id);
    } catch {}
    return NextResponse.json({ message: "Out of Stock. Please select a higher price tier." }, { status: 404 });
  }

  const reference = generateReference("otp");
  const { success: debitSuccess } = await supabase.rpc("debit_wallet", {
    p_user_id: session.id,
    p_amount: selectedTier,
    p_reference: reference,
    p_description: `OTP number: ${country} · ${product}`,
    p_type: "otp",
  });

  if (!debitSuccess) {
    try {
      await cancelOrder(order.id);
    } catch {}
    return NextResponse.json({ message: "Insufficient wallet balance" }, { status: 400 });
  }

  const { data: dbOrder, error: dbError } = await supabase
    .from("otp_orders")
    .insert({
      user_id: session.id,
      fivesim_order_id: String(order.id),
      country,
      operator: order.operator || choice.operator,
      service: product,
      phone: order.phone,
      cost_price: actualCostNgn,
      sell_price: selectedTier,
      status: order.status || "PENDING",
      metadata: order,
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ message: dbError.message }, { status: 500 });
  }

  await supabase
    .from("transactions")
    .update({ cost_price: actualCostNgn, profit })
    .eq("reference", reference);

  return NextResponse.json({ success: true, order: dbOrder });
}

async function cancelOrder(orderId: string | number) {
  const { cancelOrder: fivesimCancel } = await import("@/lib/services/fivesim");
  await fivesimCancel(orderId);
}
