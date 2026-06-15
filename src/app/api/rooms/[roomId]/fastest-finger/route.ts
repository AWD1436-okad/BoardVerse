import { NextResponse } from "next/server";
import {
  getFastestFingerState,
  submitFastestFingerOrder,
  validateFastestFingerOrder,
} from "@/lib/final-answer/fastest-finger-store";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";

export const runtime = "nodejs";

function fastestFingerError(code: string) {
  if (code === "room_not_found") {
    return jsonError("Room not found.", 404, "room_not_found");
  }

  if (code === "not_fastest_finger") {
    return jsonError("Fastest Finger is not active for this room.", 409, code);
  }

  if (code === "game_state_not_found") {
    return jsonError("Game state was not found for this room.", 409, code);
  }

  if (code === "question_bank_empty") {
    return jsonError("No Fastest Finger questions are available yet.", 409, code);
  }

  if (code === "not_eligible") {
    return jsonError("You are not eligible for this Fastest Finger round.", 403, code);
  }

  if (code === "round_closed") {
    return jsonError("This Fastest Finger round is closed.", 409, code);
  }

  if (code === "already_submitted") {
    return jsonError("You already submitted for this round.", 409, code);
  }

  return jsonError("Could not load Fastest Finger.", 500, code);
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
    return jsonError("You must be logged in to play Fastest Finger.", 401, "not_logged_in");
  }

  const { roomId } = await params;
  const result = await getFastestFingerState(context.supabase!, {
    account: context.account,
    roomId,
  });

  if (result.error || !result.state) {
    return fastestFingerError(result.error ?? "fastest_finger_error");
  }

  return NextResponse.json({ fastestFinger: result.state, ok: true });
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
    return jsonError("You must be logged in to submit Fastest Finger.", 401, "not_logged_in");
  }

  const body = (await request.json().catch(() => null)) as {
    order?: unknown;
  } | null;
  const order = validateFastestFingerOrder(body?.order);

  if (!order.ok) {
    return jsonError(order.message, 400, "invalid_order");
  }

  const { roomId } = await params;
  const result = await submitFastestFingerOrder(context.supabase!, {
    account: context.account,
    roomId,
    submittedOrder: order.submitted,
  });

  if (result.error || !result.state) {
    const errorResponse = fastestFingerError(result.error ?? "fastest_finger_error");

    if (result.state) {
      return NextResponse.json(
        {
          code: result.error,
          fastestFinger: result.state,
          message: "Fastest Finger state changed.",
          ok: false,
        },
        { status: errorResponse.status },
      );
    }

    return errorResponse;
  }

  return NextResponse.json({ fastestFinger: result.state, ok: true });
}
