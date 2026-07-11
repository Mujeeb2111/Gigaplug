import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getPricesByCountryAndProduct, getFxRateToNgn } from "@/lib/services/fivesim";
import { getOtpTiers, getFxRate } from "@/lib/admin-config";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");
  const product = searchParams.get("product");
  const operator = searchParams.get("operator") || "any";
  const tierParam = searchParams.get("tier");

  if (!country || !product) {
    return NextResponse.json({ message: "Country and product required" }, { status: 400 });
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
  const selectedTier = tierParam ? Number(tierParam) : tiers[0];

  try {
    const prices = await getPricesByCountryAndProduct(country, product);
    const operatorPrices = prices?.[country]?.[operator] || prices?.[country]?.[Object.keys(prices?.[country] || {})[0]];
    const entry = operatorPrices?.[product];
    const fx = await getFxRate();
    const costNgn = Math.ceil((entry?.cost || 0) * fx);

    if (!entry || costNgn <= 0) {
      return NextResponse.json({ message: "Out of Stock. Please select a higher price tier." }, { status: 404 });
    }

    const profit = selectedTier - costNgn;
    if (profit < minProfit) {
      return NextResponse.json({ message: "Out of Stock. Please select a higher price tier." }, { status: 404 });
    }

    if (countryRule?.is_eu && maxProfit && profit > maxProfit) {
      // Selected tier too high, but not a stock issue. Return a warning.
      return NextResponse.json({ message: "Selected tier exceeds max EU profit margin" }, { status: 400 });
    }

    return NextResponse.json({
      cost: costNgn,
      tier: selectedTier,
      profit,
      minProfit,
      maxProfit,
      available: true,
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Pricing unavailable" }, { status: 500 });
  }
}
