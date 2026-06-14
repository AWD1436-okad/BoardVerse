import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAccountBySession } from "@/lib/final-answer/account-store";
import { sessionCookieName } from "@/lib/final-answer/auth";
import {
  createSupabaseAdminClient,
  getSupabaseConfigStatus,
} from "@/lib/final-answer/supabase-admin";

export const runtime = "nodejs";

export async function GET() {
  const config = getSupabaseConfigStatus();

  if (!config.configured) {
    return NextResponse.json({
      account: null,
      configured: false,
      missing: config.missing,
      ok: true,
    });
  }

  const supabase = createSupabaseAdminClient();
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  const account = await getAccountBySession(supabase!, token);

  return NextResponse.json({
    account,
    configured: true,
    ok: true,
  });
}
