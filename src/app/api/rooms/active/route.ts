import { NextResponse } from "next/server";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";
import { getActiveRoomForAccount } from "@/lib/final-answer/room-store";

export const runtime = "nodejs";

export async function GET() {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError(
      "You must be logged in to restore a room.",
      401,
      "not_logged_in",
    );
  }

  const room = await getActiveRoomForAccount(
    context.supabase!,
    context.account.id,
  );

  return NextResponse.json({ ok: true, room });
}
