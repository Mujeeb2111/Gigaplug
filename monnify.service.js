const axios = require("axios");
const crypto = require("crypto");

const BASE_URL = process.env.MONNIFY_BASE_URL || "https://sandbox.monnify.com";
const API_KEY = process.env.MONNIFY_API_KEY;
const SECRET_KEY = process.env.MONNIFY_SECRET_KEY;
const CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE;

let cachedToken = null;
let tokenExpiresAt = 0;

// Monnify uses Basic auth (apiKey:secretKey) to mint a short-lived bearer token.
async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const basic = Buffer.from(`${API_KEY}:${SECRET_KEY}`).toString("base64");
  const { data } = await axios.post(
    `${BASE_URL}/api/v1/auth/login`,
    {},
    { headers: { Authorization: `Basic ${basic}` } }
  );

  cachedToken = data.responseBody.accessToken;
  // expiresIn is in seconds; refresh a minute early
  tokenExpiresAt = Date.now() + (data.responseBody.expiresIn - 60) * 1000;
  return cachedToken;
}

/**
 * Reserve a permanent virtual account for a user so they can fund their
 * wallet by bank transfer at any time.
 * NOTE: Per CBN rules, live (non-sandbox) reserved accounts require a BVN
 * or NIN on the request for the account to have a normal transaction limit.
 */
async function createReservedAccount({ userId, email, fullName, bvn }) {
  const token = await getAccessToken();
  const accountReference = `gigaplug-${userId}`;

  const payload = {
    accountReference,
    accountName: `Gigaplug - ${fullName}`.slice(0, 60),
    currencyCode: "NGN",
    contractCode: CONTRACT_CODE,
    customerEmail: email,
    customerName: fullName,
    getAllAvailableBanks: true,
  };
  if (bvn) payload.bvn = bvn;

  const { data } = await axios.post(
    `${BASE_URL}/api/v2/bank-transfer/reserved-accounts`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const body = data.responseBody;
  const firstAccount = (body.accounts || [])[0] || {};

  return {
    accountReference: body.accountReference,
    accountNumber: firstAccount.accountNumber,
    bankName: firstAccount.bankName,
    accountName: body.accountName,
    raw: body,
  };
}

/**
 * Verify the `monnify-signature` header on incoming webhooks so we only
 * credit wallets for events that actually came from Monnify.
 * Monnify signs the raw JSON body with HMAC-SHA512 using your secret key.
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  const computed = crypto
    .createHmac("sha512", SECRET_KEY)
    .update(rawBody)
    .digest("hex");
  return computed === signatureHeader;
}

module.exports = { getAccessToken, createReservedAccount, verifyWebhookSignature };
