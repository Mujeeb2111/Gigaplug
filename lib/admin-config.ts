import { getSupabaseServerClient } from "./supabase";

export type AdminConfig = {
  otp_tiers?: number[];
  fx_rate?: number;
  data_markup?: number;
};

const defaults: AdminConfig = {
  otp_tiers: [5000, 10000, 15000],
  fx_rate: 1,
  data_markup: 20,
};

export async function getAdminConfig(): Promise<AdminConfig> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("admin_config").select("key, value");
  if (error) {
    throw new Error("Failed to load admin config: " + error.message);
  }
  const config = (data || []).reduce((acc: Record<string, any>, row: any) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, any>);
  return { ...defaults, ...config };
}

export async function getOtpTiers(): Promise<number[]> {
  const config = await getAdminConfig();
  return config.otp_tiers || defaults.otp_tiers!;
}

export async function getFxRate(): Promise<number> {
  const config = await getAdminConfig();
  return Number(config.fx_rate || defaults.fx_rate!);
}

export async function getDataMarkup(): Promise<number> {
  const config = await getAdminConfig();
  return Number(config.data_markup || defaults.data_markup!);
}

export async function setAdminConfig(key: string, value: any) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("admin_config").upsert(
    { key, value },
    { onConflict: "key" }
  );
  if (error) {
    throw new Error("Failed to set admin config: " + error.message);
  }
}
