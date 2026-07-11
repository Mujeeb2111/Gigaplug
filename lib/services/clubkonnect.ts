import axios from "axios";
import { getApiKey } from "@/lib/api-keys";
import { logApiCall } from "@/lib/services/log";
import { v4 as uuidv4 } from "uuid";

const BASE_URL = process.env.CLUBKONNECT_BASE_URL || "https://www.nellobytesystems.com";

export const NETWORK_CODES: Record<string, string> = {
  MTN: "01",
  Glo: "02",
  "9mobile": "03",
  Airtel: "04",
};

export async function fetchDataPlans() {
  const userId = await getApiKey("CLUBKONNECT_USER_ID");
  const apiKey = await getApiKey("CLUBKONNECT_API_KEY");
  const url = `${BASE_URL}/APIDatabundlePlansV2.asp`;
  const start = Date.now();
  try {
    const response = await axios.get(url, {
      params: { UserID: userId, APIKey: apiKey },
      timeout: 30000,
    });
    await logApiCall({
      provider: "clubkonnect",
      method: "GET",
      endpoint: url,
      request: { UserID: userId, APIKey: apiKey },
      response: response.data,
      status: response.status,
      durationMs: Date.now() - start,
    });

    const plans: Array<{
      network: string;
      planCode: string;
      name: string;
      apiCost: number;
    }> = [];
    const networkBlocks = response.data?.MOBILE_NETWORK || [];
    for (const block of networkBlocks) {
      const networkName = block.PRODUCT_NAME || block.NETWORK || "";
      const list = block.PRODUCT || block.DATA_PLAN || [];
      for (const p of list) {
        plans.push({
          network: networkName,
          planCode: p.PRODUCT_CODE || p.DATA_PLAN || p.CODE,
          name: p.PRODUCT_NAME || p.DATA_PLAN_NAME || p.NAME,
          apiCost: Number(p.PRODUCT_AMOUNT || p.PRICE || p.AMOUNT || 0),
        });
      }
    }
    return plans;
  } catch (err: any) {
    await logApiCall({
      provider: "clubkonnect",
      method: "GET",
      endpoint: url,
      request: { UserID: userId, APIKey: apiKey },
      response: err?.response?.data || err?.message,
      status: err?.response?.status || 0,
      durationMs: Date.now() - start,
    });
    throw err;
  }
}

export async function purchaseData({
  network,
  planCode,
  phone,
  requestId,
}: {
  network: string;
  planCode: string;
  phone: string;
  requestId?: string;
}) {
  const userId = await getApiKey("CLUBKONNECT_USER_ID");
  const apiKey = await getApiKey("CLUBKONNECT_API_KEY");
  const networkCode = NETWORK_CODES[network];
  if (!networkCode) throw new Error(`Unknown network: ${network}`);
  const reqId = requestId || uuidv4().replace(/-/g, "").slice(0, 20);
  const url = `${BASE_URL}/APIDatabundleV1.asp`;
  const params = {
    UserID: userId,
    APIKey: apiKey,
    MobileNetwork: networkCode,
    DataPlan: planCode,
    MobileNumber: phone,
    RequestID: reqId,
  };
  const start = Date.now();
  try {
    const response = await axios.get(url, { params, timeout: 30000 });
    await logApiCall({
      provider: "clubkonnect",
      method: "GET",
      endpoint: url,
      request: params,
      response: response.data,
      status: response.status,
      durationMs: Date.now() - start,
    });
    const status = response.data?.status || response.data?.Status;
    const success = ["ORDER_RECEIVED", "ORDER_COMPLETED"].includes(status);
    return { success, status, raw: response.data, requestId: reqId };
  } catch (err: any) {
    await logApiCall({
      provider: "clubkonnect",
      method: "GET",
      endpoint: url,
      request: params,
      response: err?.response?.data || err?.message,
      status: err?.response?.status || 0,
      durationMs: Date.now() - start,
    });
    throw err;
  }
}
