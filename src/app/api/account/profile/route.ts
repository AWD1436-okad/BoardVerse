import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getAccountBySession,
  updateDisplayName,
} from "@/lib/final-answer/account-store";
import {
  sessionCookieName,
  validateDisplayName,
} from "@/lib/final-answer/auth";
import { jsonError, setupRequired } from "@/lib/final-answer/responses";
import {
  createSupabaseAdminClient,
  getSupabaseConfigStatus,
} from "@/lib/final-answer/supabase-admin";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const config = getSupabaseConfigStatus();

  if (!config.configured) {
    return setupRequired(config.missing);
  }

  const body = (await request.json().catch(() => null)) as {
    displayName?: string;
  } | null;
  const displayName = validateDisplayName(body?.displayName ?? "");

  if (!displayName.ok) {
    return jsonError(displayName.message, 400, "invalid_display_name");
  }

  const supabase = createSupabaseAdminClient();
  const cookieStore = await cookies();
  const account = await getAccountBySession(
    supabase!,
    cookieStore.get(sessionCookieName)?.value,
  );

  if (!account) {
    return jsonError("Log in before editing your profile.", 401, "not_logged_in");
  }

  const updatedAccount = await updateDisplayName(supabase!, {
    accountId: account.id,
    displayName: displayName.cleaned,
  });

  return NextResponse.json({ account: updatedAccount, ok: true });
}
