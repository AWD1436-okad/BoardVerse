import { createClient } from "@supabase/supabase-js";

export function getSupabaseConfigStatus() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    configured: Boolean(url && secretKey),
    missing: [
      !url ? "NEXT_PUBLIC_SUPABASE_URL" : "",
      !secretKey ? "SUPABASE_SECRET_KEY" : "",
    ].filter(Boolean),
    secretKey,
    url,
  };
}

export function createSupabaseAdminClient() {
  const config = getSupabaseConfigStatus();

  if (!config.configured || !config.url || !config.secretKey) {
    return null;
  }

  return createClient(config.url, config.secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
