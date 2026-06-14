import { NextResponse } from "next/server";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";
import { startRoom } from "@/lib/final-answer/room-store";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError("You must be logged in to start a room.", 401, "not_logged_in");
  }

  const { roomId } = await params;
  const result = await startRoom(context.supabase!, {
    accountId: context.account.id,
    roomId,
  });

  if (result.error === "room_not_found") {
    return jsonError("Room not found.", 404, "room_not_found");
  }

  if (result.error === "host_only") {
    return jsonError("Only the host can start the game.", 403, "host_only");
  }

  if (result.error === "room_not_full") {
    return jsonError("Room must have exactly the selected player count.", 409, "room_not_full");
  }

  if (result.error === "not_all_ready") {
    return jsonError("Every player must be ready before starting.", 409, "not_all_ready");
  }

  if (result.error === "game_already_started") {
    return jsonError("Game already started.", 409, "game_already_started");
  }

  return NextResponse.json({ ok: true, room: result.room });
}
