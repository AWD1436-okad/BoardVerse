import { NextResponse } from "next/server";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";
import {
  getRandomQuestion,
  questionPrizes,
  validateQuestionLevel,
} from "@/lib/final-answer/question-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError(
      "You must be logged in to load a question.",
      401,
      "not_logged_in",
    );
  }

  const url = new URL(request.url);
  const level = validateQuestionLevel(url.searchParams.get("level"));

  if (!level.ok) {
    return jsonError(level.message, 400, "invalid_level");
  }

  const excludeQuestionIds = url.searchParams
    .getAll("exclude")
    .filter((value) => /^[0-9a-f-]{36}$/i.test(value));
  const question = await getRandomQuestion(context.supabase!, {
    excludeQuestionIds,
    level: level.level,
  });

  if (!question) {
    return jsonError(
      "No active question is available for this level.",
      404,
      "question_not_found",
    );
  }

  return NextResponse.json({
    ok: true,
    prizeAmount: questionPrizes[level.level - 1],
    question,
  });
}
