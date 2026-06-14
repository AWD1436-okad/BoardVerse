import { NextResponse } from "next/server";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";
import { getRoom } from "@/lib/final-answer/room-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError("You must be logged in to view a room.", 401, "not_logged_in");
  }

  const { roomId } = await params;
  const room = await getRoom(context.supabase!, roomId);

  if (!room) {
    return jsonError("Room not found.", 404, "room_not_found");
  }

  return NextResponse.json({ ok: true, room });
}
