import { NextResponse } from "next/server";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";
import { createRoom, validatePlayerCount } from "@/lib/final-answer/room-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError("You must be logged in to create a room.", 401, "not_logged_in");
  }

  const body = (await request.json().catch(() => null)) as {
    playerCount?: number;
  } | null;
  const playerCount = validatePlayerCount(body?.playerCount);

  if (!playerCount.ok) {
    return jsonError(playerCount.message, 400, "invalid_player_count");
  }

  const room = await createRoom(context.supabase!, {
    account: context.account,
    selectedPlayerCount: playerCount.count,
  });

  return NextResponse.json({ ok: true, room });
}
