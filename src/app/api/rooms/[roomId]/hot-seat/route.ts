import { NextResponse } from "next/server";
import {
  continueHotSeat,
  getHotSeatState,
  submitFinalAnswer,
  validateAnswerKey,
} from "@/lib/final-answer/hot-seat-store";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";

export const runtime = "nodejs";

function hotSeatError(code: string) {
  if (code === "room_not_found") {
    return jsonError("Room not found.", 404, "room_not_found");
  }

  if (code === "not_hot_seat") {
    return jsonError("Hot Seat is not active for this room.", 409, code);
  }

  if (code === "game_state_not_found") {
    return jsonError("Game state was not found for this room.", 409, code);
  }

  if (code === "question_bank_empty") {
    return jsonError("No hot-seat questions are available yet.", 409, code);
  }

  if (code === "not_in_room") {
    return jsonError("You are not in this room.", 403, code);
  }

  if (code === "not_hot_seat_player") {
    return jsonError("Only the hot-seat player can do that.", 403, code);
  }

  if (code === "answer_locked") {
    return jsonError("That answer has already been locked.", 409, code);
  }

  if (code === "answer_required") {
    return jsonError("Lock a final answer before continuing.", 409, code);
  }

  return jsonError("Could not load Hot Seat.", 500, code);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError("You must be logged in to view Hot Seat.", 401, "not_logged_in");
  }

  const { roomId } = await params;
  const result = await getHotSeatState(context.supabase!, {
    account: context.account,
    roomId,
  });

  if (result.error || !result.state) {
    return hotSeatError(result.error ?? "hot_seat_error");
  }

  return NextResponse.json({ hotSeat: result.state, ok: true });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError("You must be logged in to play Hot Seat.", 401, "not_logged_in");
  }

  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    answer?: unknown;
  } | null;
  const { roomId } = await params;

  if (body?.action === "continue") {
    const result = await continueHotSeat(context.supabase!, {
      account: context.account,
      roomId,
    });

    if (result.error) {
      return hotSeatError(result.error);
    }

    return NextResponse.json({ hotSeat: result.state, ok: true, room: result.room });
  }

  if (body?.action !== "answer") {
    return jsonError("Choose a valid Hot Seat action.", 400, "invalid_action");
  }

  const answer = validateAnswerKey(body.answer);

  if (!answer.ok) {
    return jsonError(answer.message, 400, "invalid_answer");
  }

  const result = await submitFinalAnswer(context.supabase!, {
    account: context.account,
    answer: answer.answer,
    roomId,
  });

  if (result.error || !result.state) {
    const errorResponse = hotSeatError(result.error ?? "hot_seat_error");

    if (result.state) {
      return NextResponse.json(
        {
          code: result.error,
          hotSeat: result.state,
          message: "Hot Seat state changed.",
          ok: false,
        },
        { status: errorResponse.status },
      );
    }

    return errorResponse;
  }

  return NextResponse.json({ hotSeat: result.state, ok: true });
}
