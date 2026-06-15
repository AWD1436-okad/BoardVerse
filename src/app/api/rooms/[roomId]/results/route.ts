import { NextResponse } from "next/server";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";
import { getGameResults } from "@/lib/final-answer/result-store";

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
    return jsonError("You must be logged in to view results.", 401, "not_logged_in");
  }

  const { roomId } = await params;
  const result = await getGameResults(context.supabase!, {
    account: context.account,
    roomId,
  });

  if (result.error === "room_not_found") {
    return jsonError("Room not found.", 404, "room_not_found");
  }

  if (result.error === "not_in_room") {
    return jsonError("You are not in this room.", 403, "not_in_room");
  }

  if (result.error === "not_completed") {
    return jsonError("The game is not completed yet.", 409, "not_completed");
  }

  return NextResponse.json({ ok: true, results: result.results });
}
