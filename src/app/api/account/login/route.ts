import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { loginAccount } from "@/lib/final-answer/account-store";
import {
  normalizeUsername,
  sessionCookieName,
  sessionMaxAgeSeconds,
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
    pin?: string;
    username?: string;
  } | null;

  const username = validateUsername(body?.username ?? "");
  if (!username.ok) {
    return jsonError("Wrong username or PIN.", 401, "invalid_login");
  }

  const pin = validatePin(body?.pin ?? "");
  if (!pin.ok) {
    return jsonError(pin.message, 400, "invalid_pin");
  }

  const supabase = createSupabaseAdminClient();
  const result = await loginAccount(supabase!, {
    pin: body!.pin!,
    username: normalizeUsername(body!.username!),
  });

  if (result.error === "locked") {
    return jsonError(
      "Too many failed attempts. Try again later.",
      429,
      "too_many_attempts",
    );
  }

  if (result.error === "invalid_login") {
    return jsonError("Wrong username or PIN.", 401, "invalid_login");
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
