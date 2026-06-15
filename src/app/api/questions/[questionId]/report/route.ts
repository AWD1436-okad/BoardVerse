import { NextResponse } from "next/server";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";
import {
  reportQuestion,
  validateReportReason,
} from "@/lib/final-answer/question-store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ questionId: string }> },
) {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError(
      "You must be logged in to report a question.",
      401,
      "not_logged_in",
    );
  }

  const body = (await request.json().catch(() => null)) as {
    reason?: string;
  } | null;
  const reason = validateReportReason(body?.reason);

  if (!reason.ok) {
    return jsonError(reason.message, 400, "invalid_report_reason");
  }

  const { questionId } = await params;
  const result = await reportQuestion(context.supabase!, {
    account: context.account,
    questionId,
    reason: reason.reason,
  });

  if (result.error === "question_not_found") {
    return jsonError("Question not found.", 404, "question_not_found");
  }

  if (result.error === "already_reported") {
    return jsonError(
      "You already reported this question for that reason.",
      409,
      "already_reported",
    );
  }

  return NextResponse.json({
    ok: true,
    reportCount: result.reportCount,
  });
}
