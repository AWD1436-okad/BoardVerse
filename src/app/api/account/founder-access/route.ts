import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  clearFounderAccessAttempts,
  enableAccountAdmin,
  getFounderAccessLockout,
  recordFailedFounderAccess,
} from "@/lib/final-answer/account-store";
import { getFounderAccessConfig } from "@/lib/final-answer/founder-access-config";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";

export const runtime = "nodejs";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function founderDetailsMatch(
  expected: { displayName: string; founderPhrase: string; username: string },
  input: {
  displayName?: unknown;
  founderPhrase?: unknown;
  username?: unknown;
  },
) {
  return (
    typeof input.username === "string" &&
    typeof input.displayName === "string" &&
    typeof input.founderPhrase === "string" &&
    safeEqual(input.username, expected.username) &&
    safeEqual(input.displayName, expected.displayName) &&
    safeEqual(input.founderPhrase, expected.founderPhrase)
  );
}

export async function POST(request: Request) {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError(
      "Log in before using Founder Access.",
      401,
      "not_logged_in",
    );
  }

  const founderConfig = getFounderAccessConfig();

  if (!founderConfig.config) {
    const details = [
      ...founderConfig.missing.map((key) => `${key} missing`),
      ...founderConfig.blank.map((key) => `${key} blank`),
    ];

    return NextResponse.json(
      {
        blank: founderConfig.blank,
        code: "founder_access_unconfigured",
        config: founderConfig.status,
        message:
          details.length > 0
            ? `Founder Access is not configured: ${details.join(", ")}.`
            : "Founder Access is not configured yet.",
        missing: founderConfig.missing,
        ok: false,
      },
      { status: 503 },
    );
  }

  const lockout = await getFounderAccessLockout(
    context.supabase!,
    context.account.id,
  );

  if (lockout.isLocked) {
    return jsonError(
      "Too many failed attempts. Try again later.",
      429,
      "founder_access_locked",
    );
  }

  const body = (await request.json().catch(() => null)) as {
    displayName?: unknown;
    founderPhrase?: unknown;
    username?: unknown;
  } | null;

  if (!body || !founderDetailsMatch(founderConfig.config, body)) {
    await recordFailedFounderAccess(context.supabase!, context.account.id);

    return jsonError(
      "Invalid founder access details",
      401,
      "invalid_founder_access",
    );
  }

  const account = await enableAccountAdmin(context.supabase!, context.account.id);
  await clearFounderAccessAttempts(context.supabase!, context.account.id);

  return NextResponse.json({
    account,
    message: "Founder access enabled",
    ok: true,
  });
}
