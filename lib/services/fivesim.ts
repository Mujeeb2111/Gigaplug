import axios from "axios";
import { getApiKey } from "@/lib/api-keys";
import { logApiCall } from "@/lib/services/log";

const BASE_URL = process.env.FIVESIM_BASE_URL || "https://5sim.net/v1";

async function fivesimRequest<T = any>({
  method,
  path,
  params,
  userId,
}: {
  method: "GET" | "POST";
  path: string;
  params?: Record<string, any>;
  userId?: string;
}): Promise<T> {
  const apiKey = await getApiKey("FIVESIM_API_KEY");
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  try {
    const response = await axios({
      method,
      url,
      params,
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      timeout: 30000,
    });
    await logApiCall({
      provider: "5sim",
      method,
      endpoint: url,
      request: params || {},
      response: response.data,
      status: response.status,
      durationMs: Date.now() - start,
    });
    return response.data;
  } catch (err: any) {
    await logApiCall({
      provider: "5sim",
      method,
      endpoint: url,
      request: params || {},
      response: err?.response?.data || err?.message,
      status: err?.response?.status || 0,
      durationMs: Date.now() - start,
    });
    throw err;
  }
}

export async function getCountries() {
  return fivesimRequest({ method: "GET", path: "/guest/countries" });
}

export async function getProducts(country: string, operator = "any") {
  return fivesimRequest({ method: "GET", path: `/guest/products/${country}/${operator}` });
}

export type PriceEntry = { cost: number; count: number; rate: number };
export type PricesResponse = Record<string, Record<string, Record<string, PriceEntry>>>;

export async function getPricesByCountryAndProduct(country: string, product: string) {
  return fivesimRequest<PricesResponse>({
    method: "GET",
    path: "/guest/prices",
    params: { country, product },
  });
}

export async function buyActivation({
  country,
  operator,
  product,
}: {
  country: string;
  operator: string;
  product: string;
}) {
  return fivesimRequest({
    method: "GET",
    path: `/user/buy/activation/${country}/${operator}/${product}`,
  });
}

export async function checkOrder(orderId: string | number) {
  return fivesimRequest({ method: "GET", path: `/user/check/${orderId}` });
}

export async function cancelOrder(orderId: string | number) {
  return fivesimRequest({ method: "GET", path: `/user/cancel/${orderId}` });
}

export function getFxRateToNgn(): number {
  return Number(process.env.FIVESIM_FX_TO_NGN || 1);
}
