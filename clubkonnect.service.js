const axios = require("axios");

const BASE_URL = process.env.CLUBKONNECT_BASE_URL || "https://www.nellobytesystems.com";
const USER_ID = process.env.CLUBKONNECT_USER_ID;
const API_KEY = process.env.CLUBKONNECT_API_KEY;

// ClubKonnect's own numeric network codes. Confirm these against your
// ClubKonnect dashboard before going live - they occasionally add new ones.
const NETWORK_CODES = { MTN: "01", Glo: "02", "9mobile": "03", Airtel: "04" };

/**
 * Pull the live data plan catalogue from ClubKonnect.
 * Response shape varies by account, so we defensively normalize it into
 * { network, planCode, name, apiCost } objects the frontend can consume.
 */
async function fetchDataPlans() {
  const { data } = await axios.get(`${BASE_URL}/APIDatabundlePlansV2.asp`, {
    params: { UserID: USER_ID, APIKey: API_KEY },
  });

  const plans = [];
  const networkBlocks = data?.MOBILE_NETWORK || [];
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
}

/**
 * Purchase a data bundle for a customer's phone number.
 * ClubKonnect's data endpoint is a plain HTTPS GET with query params.
 */
async function purchaseData({ network, planCode, phone, requestId }) {
  const networkCode = NETWORK_CODES[network];
  if (!networkCode) throw new Error(`Unknown network: ${network}`);

  const { data } = await axios.get(`${BASE_URL}/APIDatabundleV1.asp`, {
    params: {
      UserID: USER_ID,
      APIKey: API_KEY,
      MobileNetwork: networkCode,
      DataPlan: planCode,
      MobileNumber: phone,
      RequestID: requestId,
    },
  });

  // ClubKonnect returns e.g. {"status":"ORDER_RECEIVED","orderid":"..."} or
  // {"status":"ORDER_COMPLETED", ...} or an error status/string.
  const status = data.status || data.Status;
  const success = ["ORDER_RECEIVED", "ORDER_COMPLETED"].includes(status);

  return { success, status, raw: data };
}

async function queryOrder(orderId) {
  const { data } = await axios.get(`${BASE_URL}/APIQuery.asp`, {
    params: { UserID: USER_ID, APIKey: API_KEY, OrderID: orderId },
  });
  return data;
}

module.exports = { fetchDataPlans, purchaseData, queryOrder, NETWORK_CODES };
