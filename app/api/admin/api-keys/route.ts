import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase";
import { clearApiKeyCache } from "@/lib/api-keys";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("api_keys").select("*").order("provider");
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ keys: data });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth) return auth;

  const body = await request.json();
  if (!body.key_name || body.value === undefined) {
    return NextResponse.json({ message: "key_name and value required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await (supabase.from("api_keys") as any).upsert(
    {
      provider: body.provider || "api",
      key_name: body.key_name,
      value: body.value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider,key_name" }
  );

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  clearApiKeyCache();
  return NextResponse.json({ success: true });
}
