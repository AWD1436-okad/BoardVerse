import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicAccount } from "./auth";
import starterQuestionRows from "./starter-questions.json";

export type QuestionReportReason =
  | "wrong_answer"
  | "ambiguous_wording"
  | "typo"
  | "other";

export type PublicQuestion = {
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  category: string;
  id: string;
  level: number;
  prizeAmount: number;
  questionText: string;
};

export type AdminReportedQuestion = PublicQuestion & {
  active: boolean;
  correctAnswer: "A" | "B" | "C" | "D";
  createdAt: string;
  reportCount: number;
  reports: Array<{
    accountId: string;
    createdAt: string;
    displayName: string;
    note: string | null;
    reason: QuestionReportReason;
    roomId: string | null;
    turnId: string | null;
    username: string;
  }>;
};

export type AdminQuestion = AdminReportedQuestion;

export type AdminQuestionSummary = {
  activeCount: number;
  answerBalance: Record<"A" | "B" | "C" | "D", number>;
  categories: Array<{ activeCount: number; category: string; totalCount: number }>;
  inactiveCount: number;
  levelCounts: Array<{
    activeCount: number;
    inactiveCount: number;
    level: number;
    prizeAmount: number;
    totalCount: number;
  }>;
  reportedCount: number;
  totalCount: number;
};

type QuestionRow = {
  active?: boolean;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  category: string;
  correct_answer?: "A" | "B" | "C" | "D";
  created_at?: string;
  id: string;
  level: number;
  prize_amount: number;
  question_text: string;
  report_count?: number;
};

type QuestionSeedRow = {
  active: boolean;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  category: string;
  correct_answer: "A" | "B" | "C" | "D";
  level: number;
  prize_amount: number;
  question_text: string;
  report_count: number;
};

type ReportRow = {
  account_id: string;
  accounts:
    | {
        display_name: string;
        username: string;
      }
    | Array<{
        display_name: string;
        username: string;
      }>
    | null;
  created_at: string;
  hot_seat_turn_id: string | null;
  note: string | null;
  reason: QuestionReportReason;
  room_id: string | null;
};

type AdminQuestionFilters = {
  active?: "active" | "inactive" | "all";
  category?: string;
  level?: number;
  minReportCount?: number;
  search?: string;
};

export const questionPrizes = [
  100, 500, 1000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000,
  1000000,
] as const;

export const reportReasonLabels: Record<QuestionReportReason, string> = {
  ambiguous_wording: "Ambiguous wording",
  other: "Other",
  typo: "Typo",
  wrong_answer: "Wrong answer",
};

export function validateQuestionLevel(value: unknown) {
  const level = Number(value);

  if (!Number.isInteger(level) || level < 1 || level > 12) {
    return {
      ok: false,
      message: "Choose a question level from 1 to 12.",
    } as const;
  }

  return { level, ok: true } as const;
}

export function validateReportReason(value: unknown) {
  if (
    value === "wrong_answer" ||
    value === "ambiguous_wording" ||
    value === "typo" ||
    value === "other"
  ) {
    return { ok: true, reason: value } as const;
  }

  return {
    ok: false,
    message: "Choose a valid report reason.",
  } as const;
}

function publicQuestion(row: QuestionRow): PublicQuestion {
  return {
    answerA: row.answer_a,
    answerB: row.answer_b,
    answerC: row.answer_c,
    answerD: row.answer_d,
    category: row.category,
    id: row.id,
    level: row.level,
    prizeAmount: row.prize_amount,
    questionText: row.question_text,
  };
}

function accountForReport(report: ReportRow) {
  return Array.isArray(report.accounts) ? report.accounts[0] : report.accounts;
}

export async function getRandomQuestion(
  supabase: SupabaseClient,
  input: { excludeQuestionIds?: string[]; level: number },
) {
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, question_text, answer_a, answer_b, answer_c, answer_d, level, prize_amount, category",
    )
    .eq("level", input.level)
    .eq("active", true);

  if (error) {
    throw error;
  }

  const excluded = new Set(input.excludeQuestionIds ?? []);
  const available = ((data ?? []) as QuestionRow[]).filter(
    (row) => !excluded.has(row.id),
  );

  if (available.length === 0) {
    return null;
  }

  return publicQuestion(available[Math.floor(Math.random() * available.length)]);
}

export async function reportQuestion(
  supabase: SupabaseClient,
  input: {
    account: PublicAccount;
    note?: string;
    questionId: string;
    reason: QuestionReportReason;
    roomId?: string;
    turnId?: string;
  },
) {
  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select("id, report_count")
    .eq("id", input.questionId)
    .maybeSingle();

  if (questionError) {
    throw questionError;
  }

  if (!question) {
    return { error: "question_not_found" as const, reportCount: 0 };
  }

  const { error: insertError } = await supabase.from("question_reports").insert({
    account_id: input.account.id,
    hot_seat_turn_id: input.turnId ?? null,
    note: input.note?.trim() ? input.note.trim().slice(0, 240) : null,
    question_id: input.questionId,
    reason: input.reason,
    room_id: input.roomId ?? null,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        error: "already_reported" as const,
        reportCount: question.report_count ?? 0,
      };
    }

    throw insertError;
  }

  const { data: updated, error: updatedError } = await supabase
    .from("questions")
    .select("report_count")
    .eq("id", input.questionId)
    .single();

  if (updatedError) {
    throw updatedError;
  }

  return {
    error: null,
    reportCount: updated.report_count ?? 0,
  };
}

export async function listReportedQuestions(supabase: SupabaseClient) {
  const { data: questions, error: questionError } = await supabase
    .from("questions")
    .select(
      "id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, level, prize_amount, category, active, report_count, created_at",
    )
    .gt("report_count", 0)
    .order("report_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (questionError) {
    throw questionError;
  }

  if (!questions?.length) {
    return [];
  }

  const questionIds = questions.map((question) => question.id);
  const { data: reports, error: reportError } = await supabase
    .from("question_reports")
    .select(
      "question_id, account_id, reason, note, room_id, hot_seat_turn_id, created_at, accounts(username, display_name)",
    )
    .in("question_id", questionIds)
    .order("created_at", { ascending: false });

  if (reportError) {
    throw reportError;
  }

  const reportsByQuestion = new Map<string, ReportRow[]>();
  for (const report of (reports ?? []) as unknown as Array<
    ReportRow & { question_id: string }
  >) {
    reportsByQuestion.set(report.question_id, [
      ...(reportsByQuestion.get(report.question_id) ?? []),
      report,
    ]);
  }

  return (questions as QuestionRow[]).map((question) => ({
    ...publicQuestion(question),
    active: Boolean(question.active),
    correctAnswer: question.correct_answer ?? "A",
    createdAt: question.created_at ?? "",
    reportCount: question.report_count ?? 0,
    reports: (reportsByQuestion.get(question.id) ?? []).map((report) => {
      const account = accountForReport(report);

      return {
        accountId: report.account_id,
        createdAt: report.created_at,
        displayName: account?.display_name ?? "Unknown",
        note: report.note,
        reason: report.reason,
        roomId: report.room_id,
        turnId: report.hot_seat_turn_id,
        username: account?.username ?? "unknown",
      };
    }),
  })) satisfies AdminReportedQuestion[];
}

async function reportsForQuestions(supabase: SupabaseClient, questionIds: string[]) {
  if (!questionIds.length) {
    return new Map<string, ReportRow[]>();
  }

  const { data: reports, error } = await supabase
    .from("question_reports")
    .select(
      "question_id, account_id, reason, note, room_id, hot_seat_turn_id, created_at, accounts(username, display_name)",
    )
    .in("question_id", questionIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const reportsByQuestion = new Map<string, ReportRow[]>();
  for (const report of (reports ?? []) as unknown as Array<
    ReportRow & { question_id: string }
  >) {
    reportsByQuestion.set(report.question_id, [
      ...(reportsByQuestion.get(report.question_id) ?? []),
      report,
    ]);
  }

  return reportsByQuestion;
}

function adminQuestion(
  question: QuestionRow,
  reportsByQuestion: Map<string, ReportRow[]>,
): AdminQuestion {
  return {
    ...publicQuestion(question),
    active: Boolean(question.active),
    correctAnswer: question.correct_answer ?? "A",
    createdAt: question.created_at ?? "",
    reportCount: question.report_count ?? 0,
    reports: (reportsByQuestion.get(question.id) ?? []).map((report) => {
      const account = accountForReport(report);

      return {
        accountId: report.account_id,
        createdAt: report.created_at,
        displayName: account?.display_name ?? "Unknown",
        note: report.note,
        reason: report.reason,
        roomId: report.room_id,
        turnId: report.hot_seat_turn_id,
        username: account?.username ?? "unknown",
      };
    }),
  };
}

export async function getQuestionAdminSummary(
  supabase: SupabaseClient,
): Promise<AdminQuestionSummary> {
  const rows: QuestionRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("questions")
      .select("level, prize_amount, category, active, correct_answer, report_count")
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as QuestionRow[]));

    if (!data || data.length < pageSize) {
      break;
    }
  }

  const answerBalance = { A: 0, B: 0, C: 0, D: 0 };
  const levelCounts = questionPrizes.map((prizeAmount, index) => ({
    activeCount: 0,
    inactiveCount: 0,
    level: index + 1,
    prizeAmount,
    totalCount: 0,
  }));
  const categoryCounts = new Map<
    string,
    { activeCount: number; category: string; totalCount: number }
  >();

  for (const row of rows) {
    const key = row.correct_answer ?? "A";
    answerBalance[key] += 1;

    const level = levelCounts[row.level - 1];
    if (level) {
      level.totalCount += 1;
      if (row.active) {
        level.activeCount += 1;
      } else {
        level.inactiveCount += 1;
      }
    }

    const category = categoryCounts.get(row.category) ?? {
      activeCount: 0,
      category: row.category,
      totalCount: 0,
    };
    category.totalCount += 1;
    if (row.active) {
      category.activeCount += 1;
    }
    categoryCounts.set(row.category, category);
  }

  return {
    activeCount: rows.filter((row) => row.active).length,
    answerBalance,
    categories: [...categoryCounts.values()].sort((a, b) =>
      a.category.localeCompare(b.category),
    ),
    inactiveCount: rows.filter((row) => !row.active).length,
    levelCounts,
    reportedCount: rows.filter((row) => (row.report_count ?? 0) > 0).length,
    totalCount: rows.length,
  };
}

export async function listAdminQuestions(
  supabase: SupabaseClient,
  filters: AdminQuestionFilters,
) {
  let query = supabase
    .from("questions")
    .select(
      "id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, level, prize_amount, category, active, report_count, created_at",
    )
    .order("level", { ascending: true })
    .order("report_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters.level) {
    query = query.eq("level", filters.level);
  }

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.active === "active") {
    query = query.eq("active", true);
  }

  if (filters.active === "inactive") {
    query = query.eq("active", false);
  }

  if (filters.minReportCount && filters.minReportCount > 0) {
    query = query.gte("report_count", filters.minReportCount);
  }

  if (filters.search?.trim()) {
    const safeSearch = filters.search.trim().replaceAll("%", "\\%");
    query = query.ilike("question_text", `%${safeSearch}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const questions = (data ?? []) as QuestionRow[];
  const reportsByQuestion = await reportsForQuestions(
    supabase,
    questions.map((question) => question.id),
  );

  return questions.map((question) => adminQuestion(question, reportsByQuestion));
}

export async function setQuestionActive(
  supabase: SupabaseClient,
  input: { active: boolean; questionId: string },
) {
  const { data, error } = await supabase
    .from("questions")
    .update({ active: input.active, updated_at: new Date().toISOString() })
    .eq("id", input.questionId)
    .select(
      "id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, level, prize_amount, category, active, report_count, created_at",
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return { error: "question_not_found" as const, question: null };
  }

  const reportsByQuestion = await reportsForQuestions(supabase, [input.questionId]);

  return {
    error: null,
    question: adminQuestion(data as QuestionRow, reportsByQuestion),
  };
}

export async function seedStarterQuestions(supabase: SupabaseClient) {
  const rows = starterQuestionRows as QuestionSeedRow[];
  const chunkSize = 50;
  let seeded = 0;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from("questions").upsert(chunk, {
      onConflict: "question_text",
    });

    if (error) {
      throw error;
    }

    seeded += chunk.length;
  }

  return {
    levels: questionPrizes.map((prize, index) => {
      const level = index + 1;

      return {
        count: rows.filter((row) => row.level === level).length,
        level,
        prizeAmount: prize,
      };
    }),
    total: seeded,
  };
}
