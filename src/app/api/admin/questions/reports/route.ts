import { NextResponse } from "next/server";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";
import { listReportedQuestions } from "@/lib/final-answer/question-store";

export const runtime = "nodejs";

export async function GET() {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError(
      "You must be logged in to view reported questions.",
      401,
      "not_logged_in",
    );
  }

  if (!context.account.isAdmin) {
    return jsonError(
      "Only admins can view reported questions.",
      403,
      "admin_only",
    );
  }

  const questions = await listReportedQuestions(context.supabase!);

  return NextResponse.json({
    ok: true,
    questions,
  });
}
