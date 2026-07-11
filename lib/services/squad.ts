import axios from "axios";
import { createHmac } from "crypto";
import { getApiKey } from "@/lib/api-keys";
import { logApiCall } from "@/lib/services/log";

const BASE_URL = process.env.SQUAD_BASE_URL || "https://sandbox-api-d.squadco.com";

async function squadRequest<T = any>({
  method,
  path,
  data,
  userId,
}: {
  method: "GET" | "POST" | "PATCH";
  path: string;
  data?: any;
  userId?: string;
}): Promise<T> {
  const apiKey = await getApiKey("SQUAD_SECRET_KEY");
  const url = `${BASE_URL}${path}`;
  const start = Date.now();
  try {
    const response = await axios({
      method,
      url,
      data,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      timeout: 30000,
    });
    await logApiCall({
      provider: "squad",
      method,
      endpoint: url,
      request: data,
      response: response.data,
      status: response.status,
      durationMs: Date.now() - start,
    });
    return response.data;
  } catch (err: any) {
    await logApiCall({
      provider: "squad",
      method,
      endpoint: url,
      request: data,
      response: err?.response?.data || err?.message,
      status: err?.response?.status || 0,
      durationMs: Date.now() - start,
    });
    throw err;
  }
}

export async function createVirtualAccount({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  // No BVN/NIN is collected from the user. Squad's dynamic virtual account
  // endpoint creates a virtual account number without BVN in the request.
  return squadRequest({
    method: "POST",
    path: "/virtual-account/create-dynamic-virtual-account",
    data: {
      first_name: "Gigaplug",
      last_name: "User",
      email,
    },
    userId,
  });
}

export function verifyWebhookSignature(payload: string, signatureHeader: string) {
  const secret = process.env.SQUAD_SECRET_KEY || "";
  if (!secret || !signatureHeader) return false;
  const computed = createHmac("sha512", secret).update(payload).digest("hex");
  return computed === signatureHeader;
}

export function parseWebhookPayload(payload: any) {
  const virtualAccountNumber = payload.virtual_account_number;
  const customerIdentifier = payload.customer_identifier;
  const amount = Number(payload.principal_amount || payload.amount_received || payload.amount || 0);
  const reference = payload.transaction_reference;

  const status = (payload.transaction_status || payload.status || "").toString().toLowerCase();
  const isSuccess = status === "success" || status === "successful" || status === "approved";

  return {
    virtualAccountNumber,
    customerIdentifier,
    amount,
    reference,
    status,
    isSuccess,
    raw: payload,
  };
}
