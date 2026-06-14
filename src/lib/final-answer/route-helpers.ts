import { cookies } from "next/headers";
import { getAccountBySession } from "./account-store";
import { sessionCookieName } from "./auth";
import { setupRequired } from "./responses";
import {
  createSupabaseAdminClient,
  getSupabaseConfigStatus,
} from "./supabase-admin";

export async function getRequestContext() {
  const config = getSupabaseConfigStatus();

  if (!config.configured) {
    return {
      account: null,
      config,
      setupResponse: setupRequired(config.missing),
      supabase: null,
    };
  }

  const supabase = createSupabaseAdminClient();
  const cookieStore = await cookies();
  const account = await getAccountBySession(
    supabase!,
    cookieStore.get(sessionCookieName)?.value,
  );

  return {
    account,
    config,
    setupResponse: null,
    supabase,
  };
}
