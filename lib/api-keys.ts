import { getSupabaseServerClient } from "./supabase";

const envFallback: Record<string, string | undefined> = {
  SQUAD_SECRET_KEY: process.env.SQUAD_SECRET_KEY,
  SQUAD_BVN: process.env.SQUAD_BVN,
  SQUAD_BENEFICIARY_ACCOUNT: process.env.SQUAD_BENEFICIARY_ACCOUNT,
  SQUAD_BVN_PHONE: process.env.SQUAD_BVN_PHONE,
  FIVESIM_API_KEY: process.env.FIVESIM_API_KEY,
  CLUBKONNECT_API_KEY: process.env.CLUBKONNECT_API_KEY,
  CLUBKONNECT_USER_ID: process.env.CLUBKONNECT_USER_ID,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
};

let cache: Record<string, string> | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 30_000;

export async function getApiKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL_MS) return cache;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("api_keys").select("key_name, value");
  if (error) {
    throw new Error("Failed to load API keys: " + error.message);
  }

  const dbKeys = (data || []).reduce(
    (acc: Record<string, string>, row: any) => {
      if (row.value) acc[row.key_name] = row.value;
      return acc;
    },
    {} as Record<string, string>
  );

  cache = { ...envFallback, ...dbKeys } as Record<string, string>;
  cacheAt = now;
  return cache;
}

export async function getApiKey(name: string): Promise<string> {
  const keys = await getApiKeys();
  const value = keys[name];
  if (!value) {
    throw new Error(`Missing required API key: ${name}`);
  }
  return value;
}

export function clearApiKeyCache() {
  cache = null;
  cacheAt = 0;
}
