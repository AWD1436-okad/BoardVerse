import { NextResponse } from "next/server";
import { jsonError } from "@/lib/final-answer/responses";
import { getRequestContext } from "@/lib/final-answer/route-helpers";
import { seedStarterQuestions } from "@/lib/final-answer/question-store";

export const runtime = "nodejs";

export async function POST() {
  const context = await getRequestContext();

  if (context.setupResponse) {
    return context.setupResponse;
  }

  if (!context.account) {
    return jsonError(
      "You must be logged in to seed starter questions.",
      401,
      "not_logged_in",
    );
  }

  if (!context.account.isAdmin) {
    return jsonError(
      "Only admins can seed starter questions.",
      403,
      "admin_only",
    );
  }

  const result = await seedStarterQuestions(context.supabase!);

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
