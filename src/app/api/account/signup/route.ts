import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAccount } from "@/lib/final-answer/account-store";
import {
  normalizeUsername,
  sessionCookieName,
  sessionMaxAgeSeconds,
  validateDisplayName,
  validatePin,
  validateUsername,
} from "@/lib/final-answer/auth";
import { jsonError, setupRequired } from "@/lib/final-answer/responses";
import {
  createSupabaseAdminClient,
  getSupabaseConfigStatus,
} from "@/lib/final-answer/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = getSupabaseConfigStatus();

  if (!config.configured) {
    return setupRequired(config.missing);
  }

  const body = (await request.json().catch(() => null)) as {
    displayName?: string;
    pin?: string;
    username?: string;
  } | null;

  const username = validateUsername(body?.username ?? "");
  if (!username.ok) {
    return jsonError(username.message, 400, "invalid_username");
  }

  const displayName = validateDisplayName(body?.displayName ?? "");
  if (!displayName.ok) {
    return jsonError(displayName.message, 400, "invalid_display_name");
  }

  const pin = validatePin(body?.pin ?? "");
  if (!pin.ok) {
    return jsonError(pin.message, 400, "invalid_pin");
  }

  const supabase = createSupabaseAdminClient();
  const result = await createAccount(supabase!, {
    displayName: displayName.cleaned,
    pin: body!.pin!,
    username: normalizeUsername(body!.username!),
  });

  if (result.error === "username_taken") {
    return jsonError("That username is already taken.", 409, "username_taken");
  }

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, result.session!.token, {
    httpOnly: true,
    maxAge: sessionMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ account: result.account, ok: true });
}
