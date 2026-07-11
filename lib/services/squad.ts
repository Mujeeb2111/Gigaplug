import axios from "axios";
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
  const bvn = process.env.SQUAD_BVN;
  if (bvn) {
    // B2B dedicated account (merchant BVN, no user-facing BVN collection)
    return squadRequest({
      method: "POST",
      path: "/virtual-account/business",
      data: {
        customer_identifier: userId,
        business_name: `Gigaplug ${email.split("@")[0]}`,
        mobile_num: process.env.SQUAD_BVN_PHONE || "08000000000",
        bvn,
        beneficiary_account: process.env.SQUAD_BENEFICIARY_ACCOUNT || "",
      },
      userId,
    });
  }

  // No-BVN fallback: create a dynamic virtual account in the merchant pool
  // This is a best-effort fallback; the user should set SQUAD_BVN for a true dedicated account.
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
  const crypto = require("crypto");
  const computed = crypto.createHmac("sha512", secret).update(payload).digest("hex");
  return computed === signatureHeader;
}

export function parseWebhookPayload(payload: any) {
  // Dedicated virtual account (B2B/B2C) webhook shape
  const dedicated = {
    virtualAccountNumber: payload.virtual_account_number,
    customerIdentifier: payload.customer_identifier,
    amount: Number(payload.principal_amount || payload.amount || 0),
    reference: payload.transaction_reference,
    status: payload.transaction_status,
  };

  // Dynamic virtual account webhook shape
  const dynamic = {
    virtualAccountNumber: payload.virtual_account_number,
    merchantReference: payload.merchant_reference,
    amount: Number(payload.amount_received || payload.merchant_amount || 0),
    reference: payload.transaction_reference,
    status: payload.transaction_status,
  };

  return { dedicated, dynamic, raw: payload };
}
