import { NextResponse } from "next/server";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";
import { joinRoom, validateRoomCode } from "@/lib/final-answer/room-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError("You must be logged in to join a room.", 401, "not_logged_in");
  }

  const body = (await request.json().catch(() => null)) as {
    code?: string;
  } | null;
  const code = validateRoomCode(body?.code ?? "");

  if (!code.ok) {
    return jsonError(code.message, 400, "invalid_room_code");
  }

  const result = await joinRoom(context.supabase!, {
    account: context.account,
    code: code.normalized,
  });

  if (result.error === "room_not_found") {
    return jsonError("Room not found.", 404, "room_not_found");
  }

  if (result.error === "room_full") {
    return jsonError("Room is full.", 409, "room_full");
  }

  if (result.error === "game_already_started") {
    return jsonError(
      "Game already started. You cannot join this room now.",
      409,
      "game_already_started",
    );
  }

  return NextResponse.json({ ok: true, room: result.room });
}
