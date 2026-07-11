import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "@/lib/services/fivesim";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");
  const operator = searchParams.get("operator") || "any";
  if (!country) return NextResponse.json({ message: "Country required" }, { status: 400 });

  try {
    const data = await getProducts(country, operator);
    return NextResponse.json({ products: data });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || "Failed to load services" }, { status: 500 });
  }
}
