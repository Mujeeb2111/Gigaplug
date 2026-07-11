import { getSupabaseServerClient } from "@/lib/supabase";

export type ApiLogInput = {
  provider: string;
  method: string;
  endpoint: string;
  request: any;
  response: any;
  status: number;
  durationMs: number;
};

export async function logApiCall(input: ApiLogInput) {
  try {
    const supabase = getSupabaseServerClient();
    await supabase.from("api_call_logs").insert({
      provider: input.provider,
      method: input.method,
      endpoint: input.endpoint,
      request: input.request,
      response: input.response,
      status: input.status,
      duration_ms: input.durationMs,
    });
  } catch (err) {
    console.error("API log insert failed:", err);
  }
}
