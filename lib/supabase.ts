import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let serverClient: any | null = null;

export function getSupabaseServerClient(): any {
  if (serverClient) return serverClient;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }
  serverClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return serverClient;
}

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let browserClient: any | null = null;

export function getSupabaseBrowserClient(): any {
  if (browserClient) return browserClient;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured");
  }
  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  return browserClient;
}
