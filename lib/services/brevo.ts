import axios from "axios";
import { getApiKey } from "@/lib/api-keys";
import { logApiCall } from "@/lib/services/log";

export async function sendOtpEmail(to: string, otp: string, name?: string) {
  const apiKey = await getApiKey("BREVO_API_KEY");
  const senderEmail = (await getApiKey("BREVO_SENDER_EMAIL")) || "noreply@gigaplug.com";
  const senderName = (await getApiKey("BREVO_SENDER_NAME")) || "GigaPlug";

  const url = "https://api.brevo.com/v3/smtp/email";
  const body = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: to, name: name || to }],
    subject: "Your GigaPlug login code",
    htmlContent: `<p>Hi ${name || to},</p><p>Your GigaPlug login code is <strong style="font-size:24px">${otp}</strong>.</p><p>This code expires in 10 minutes.</p><p>If you didn't request this, please ignore.</p>`,
  };

  const start = Date.now();
  try {
    const response = await axios.post(url, body, {
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
    });
    await logApiCall({
      provider: "brevo",
      method: "POST",
      endpoint: url,
      request: body,
      response: response.data,
      status: response.status,
      durationMs: Date.now() - start,
    });
    return response.data;
  } catch (err: any) {
    await logApiCall({
      provider: "brevo",
      method: "POST",
      endpoint: url,
      request: body,
      response: err?.response?.data || err?.message,
      status: err?.response?.status || 0,
      durationMs: Date.now() - start,
    });
    throw err;
  }
}
