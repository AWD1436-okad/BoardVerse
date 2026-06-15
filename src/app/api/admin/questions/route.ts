import { NextResponse } from "next/server";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";
import {
  getQuestionAdminSummary,
  listAdminQuestions,
  setQuestionActive,
  validateQuestionLevel,
} from "@/lib/final-answer/question-store";

export const runtime = "nodejs";

async function getAdminContext() {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return { context, response: context.setupResponse };
  }

  if (!context.account) {
    return {
      context,
      response: jsonError(
        "You must be logged in to use admin question tools.",
        401,
        "not_logged_in",
      ),
    };
  }

  if (!context.account.isAdmin) {
    return {
      context,
      response: jsonError(
        "Only admins can use question tools.",
        403,
        "admin_only",
      ),
    };
  }

  return { context, response: null };
}

export async function GET(request: Request) {
  const { context, response } = await getAdminContext();

  if (response) {
    return response;
  }

  const url = new URL(request.url);
  const rawLevel = url.searchParams.get("level");
  const level =
    rawLevel && rawLevel !== "all" ? validateQuestionLevel(rawLevel) : null;

  if (level && !level.ok) {
    return jsonError(level.message, 400, "invalid_level");
  }

  const rawMinReportCount = Number(url.searchParams.get("minReportCount") ?? 0);
  const minReportCount = Number.isFinite(rawMinReportCount)
    ? Math.max(0, Math.floor(rawMinReportCount))
    : 0;
  const active = url.searchParams.get("active");
  const summary = await getQuestionAdminSummary(context.supabase!);
  const questions = await listAdminQuestions(context.supabase!, {
    active:
      active === "active" || active === "inactive" || active === "all"
        ? active
        : "all",
    category: url.searchParams.get("category") || undefined,
    level: level?.ok ? level.level : undefined,
    minReportCount,
    search: url.searchParams.get("search") || undefined,
  });

  return NextResponse.json({
    ok: true,
    questions,
    summary,
  });
}

export async function PATCH(request: Request) {
  const { context, response } = await getAdminContext();

  if (response) {
    return response;
  }

  const body = (await request.json().catch(() => null)) as {
    active?: unknown;
    questionId?: unknown;
  } | null;

  if (typeof body?.questionId !== "string") {
    return jsonError("Choose a question to update.", 400, "invalid_question");
  }

  if (typeof body.active !== "boolean") {
    return jsonError("Choose whether the question is active.", 400, "invalid_active");
  }

  const result = await setQuestionActive(context.supabase!, {
    active: body.active,
    questionId: body.questionId,
  });

  if (result.error === "question_not_found") {
    return jsonError("Question not found.", 404, "question_not_found");
  }

  return NextResponse.json({
    ok: true,
    question: result.question,
  });
}
