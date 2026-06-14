import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/final-answer/account-store";
import { sessionCookieName } from "@/lib/final-answer/auth";
import {
  createSupabaseAdminClient,
  getSupabaseConfigStatus,
} from "@/lib/final-answer/supabase-admin";

export const runtime = "nodejs";

export async function POST() {
  const config = getSupabaseConfigStatus();
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (config.configured && token) {
    const supabase = createSupabaseAdminClient();
    await deleteSession(supabase!, token);
  }

  cookieStore.delete(sessionCookieName);

  return NextResponse.json({ ok: true });
}
