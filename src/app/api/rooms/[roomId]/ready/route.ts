import { NextResponse } from "next/server";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";
import { setReady } from "@/lib/final-answer/room-store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError("You must be logged in to update ready status.", 401, "not_logged_in");
  }

  const body = (await request.json().catch(() => null)) as {
    isReady?: boolean;
  } | null;
  const { roomId } = await params;
  const result = await setReady(context.supabase!, {
    accountId: context.account.id,
    isReady: Boolean(body?.isReady),
    roomId,
  });

  if (result.error === "room_not_found") {
    return jsonError("Room not found.", 404, "room_not_found");
  }

  if (result.error === "not_in_room") {
    return jsonError("You are not in this room.", 403, "not_in_room");
  }

  if (result.error === "game_already_started") {
    return jsonError("Game already started.", 409, "game_already_started");
  }

  return NextResponse.json({ ok: true, room: result.room });
}
