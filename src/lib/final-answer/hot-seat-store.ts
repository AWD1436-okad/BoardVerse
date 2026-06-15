import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicAccount } from "./auth";
import { emitRoomEvent, getRoom } from "./room-store";
import { questionPrizes } from "./question-store";

export type AnswerKey = "A" | "B" | "C" | "D";
type HotSeatTurnStatus =
  | "awaiting_answer"
  | "revealed_correct"
  | "revealed_wrong"
  | "turn_complete";

export type PublicHotSeatState = {
  audiencePercentages: Record<AnswerKey, number> | null;
  correctAnswer: AnswerKey | null;
  currentLevel: number;
  currentPrize: number;
  finalAnswer: AnswerKey | null;
  finalWinnings: number | null;
  hotSeatPlayer: {
    accountId: string;
    displayName: string;
  };
  isCorrect: boolean | null;
  ladder: Array<{ amount: number; isCurrent: boolean; isSafetyNet: boolean; level: number }>;
  levelsCompleted: number;
  passAvailable: boolean;
  question: {
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
  questionsCorrect: number;
  removedAnswers: AnswerKey[];
  selectedAnswer: AnswerKey | null;
  status: HotSeatTurnStatus;
  turnId: string;
  used5050: boolean;
  usedAudience: boolean;
  usedPass: boolean;
};

type QuestionRow = {
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  category: string;
  correct_answer: AnswerKey;
  id: string;
  level: number;
  prize_amount: number;
  question_text: string;
};

type GameStateRow = {
  completed_turn_account_ids: string[];
  current_hot_seat_turn_id: string | null;
  current_room_status: "starting" | "fastest_finger" | "hot_seat" | "completed";
  eligible_account_ids: string[];
  hot_seat_account_id: string | null;
  id: string;
  join_order: string[];
  room_id: string;
};

type HotSeatTurnRow = {
  account_id: string;
  answered_at: string | null;
  completed_at: string | null;
  current_level: number;
  current_prize: number;
  current_question_id: string;
  final_answer: AnswerKey | null;
  final_winnings: number | null;
  game_state_id: string;
  id: string;
  is_correct: boolean | null;
  levels_completed: number;
  audience_percentages: Record<AnswerKey, number> | null;
  pass_queue_snapshot: Record<string, unknown> | null;
  question_history: string[];
  questions_correct: number;
  removed_answers: AnswerKey[];
  room_id: string;
  selected_answer: AnswerKey | null;
  status: HotSeatTurnStatus;
  used_5050: boolean;
  used_audience: boolean;
  used_pass: boolean;
};

type Lifeline = "5050" | "audience" | "pass";

const turnSelect =
  "id, room_id, game_state_id, account_id, current_level, current_prize, current_question_id, question_history, selected_answer, final_answer, used_5050, used_audience, used_pass, removed_answers, audience_percentages, pass_queue_snapshot, status, is_correct, final_winnings, levels_completed, questions_correct, answered_at, completed_at";

function normalizeTurn(turn: HotSeatTurnRow): HotSeatTurnRow {
  return {
    ...turn,
    audience_percentages: normalizeAudiencePercentages(turn.audience_percentages),
    removed_answers: normalizeAnswerArray(turn.removed_answers),
    used_5050: Boolean(turn.used_5050),
    used_audience: Boolean(turn.used_audience),
    used_pass: Boolean(turn.used_pass),
  };
}

export function validateAnswerKey(value: unknown) {
  if (value === "A" || value === "B" || value === "C" || value === "D") {
    return { answer: value, ok: true } as const;
  }

  return { message: "Choose answer A, B, C, or D.", ok: false } as const;
}

function prizeForLevel(level: number) {
  return questionPrizes[level - 1] ?? questionPrizes[0];
}

function safetyNetForCompletedLevels(levelsCompleted: number) {
  if (levelsCompleted >= 7) {
    return 32000;
  }

  if (levelsCompleted >= 3) {
    return 1000;
  }

  return 0;
}

function ladder(currentLevel: number) {
  return questionPrizes.map((amount, index) => ({
    amount,
    isCurrent: index + 1 === currentLevel,
    isSafetyNet: amount === 1000 || amount === 32000,
    level: index + 1,
  }));
}

function answerKeys() {
  return ["A", "B", "C", "D"] as const;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeAnswerArray(value: unknown): AnswerKey[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is AnswerKey =>
    item === "A" || item === "B" || item === "C" || item === "D",
  );
}

function normalizeAudiencePercentages(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<Record<AnswerKey, unknown>>;
  return answerKeys().reduce(
    (result, answer) => ({
      ...result,
      [answer]: Number(record[answer] ?? 0),
    }),
    {} as Record<AnswerKey, number>,
  );
}

function splitRemaining(total: number, answers: AnswerKey[]) {
  if (answers.length === 0) {
    return {};
  }

  if (answers.length === 1) {
    return { [answers[0]]: total } as Partial<Record<AnswerKey, number>>;
  }

  const weights = answers.map(() => randomInt(1, 9));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let remaining = total;

  return answers.reduce((result, answer, index) => {
    const value =
      index === answers.length - 1
        ? remaining
        : Math.max(0, Math.round((total * weights[index]) / weightTotal));

    remaining -= value;
    return { ...result, [answer]: value };
  }, {} as Partial<Record<AnswerKey, number>>);
}

function generateAudiencePercentages(
  question: QuestionRow,
  input: { removedAnswers: AnswerKey[] },
) {
  const visibleAnswers = answerKeys().filter(
    (answer) => !input.removedAnswers.includes(answer),
  );
  const wrongVisible = visibleAnswers.filter(
    (answer) => answer !== question.correct_answer,
  );
  const shouldFavorCorrect = Math.random() < 0.82;
  const range =
    question.level <= 3
      ? [70, 95]
      : question.level <= 7
        ? [45, 75]
        : [25, 60];
  const correctShare =
    visibleAnswers.includes(question.correct_answer) && shouldFavorCorrect
      ? randomInt(range[0], range[1])
      : randomInt(
          Math.max(12, Math.min(range[0], 25)),
          Math.max(20, Math.min(range[1], 55)),
        );
  const clampedCorrect = Math.min(100, Math.max(0, correctShare));
  const wrongShares = splitRemaining(100 - clampedCorrect, wrongVisible);

  return answerKeys().reduce(
    (result, answer) => ({
      ...result,
      [answer]: input.removedAnswers.includes(answer)
        ? 0
        : answer === question.correct_answer
          ? clampedCorrect
          : wrongShares[answer] ?? 0,
    }),
    {} as Record<AnswerKey, number>,
  );
}

async function fetchGameState(supabase: SupabaseClient, roomId: string) {
  const { data, error } = await supabase
    .from("game_states")
    .select(
      "id, room_id, current_room_status, current_hot_seat_turn_id, hot_seat_account_id, join_order, completed_turn_account_ids, eligible_account_ids",
    )
    .eq("room_id", roomId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as GameStateRow | null;
}

async function fetchQuestion(supabase: SupabaseClient, questionId: string) {
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, level, prize_amount, category",
    )
    .eq("id", questionId)
    .single();

  if (error) {
    throw error;
  }

  return data as QuestionRow;
}

async function pickQuestion(
  supabase: SupabaseClient,
  input: { excludeQuestionIds: string[]; level: number },
) {
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, question_text, answer_a, answer_b, answer_c, answer_d, correct_answer, level, prize_amount, category",
    )
    .eq("active", true)
    .eq("level", input.level);

  if (error) {
    throw error;
  }

  const excluded = new Set(input.excludeQuestionIds);
  const available = ((data ?? []) as QuestionRow[]).filter(
    (question) => !excluded.has(question.id),
  );
  const pool = available.length ? available : ((data ?? []) as QuestionRow[]);

  if (!pool.length) {
    return null;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

async function fetchTurn(supabase: SupabaseClient, turnId: string) {
  const { data, error } = await supabase
    .from("hot_seat_turns")
    .select(turnSelect)
    .eq("id", turnId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeTurn(data as HotSeatTurnRow) : null;
}

async function fetchActiveTurn(
  supabase: SupabaseClient,
  input: { accountId: string; gameStateId: string },
) {
  const { data, error } = await supabase
    .from("hot_seat_turns")
    .select(turnSelect)
    .eq("game_state_id", input.gameStateId)
    .eq("account_id", input.accountId)
    .neq("status", "turn_complete")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? normalizeTurn(data as HotSeatTurnRow) : null;
}

async function createTurn(
  supabase: SupabaseClient,
  input: {
    accountId: string;
    excludeQuestionIds?: string[];
    gameState: GameStateRow;
    level?: number;
    roomId: string;
  },
) {
  const level = input.level ?? 1;
  const question = await pickQuestion(supabase, {
    excludeQuestionIds: input.excludeQuestionIds ?? [],
    level,
  });

  if (!question) {
    return null;
  }

  const now = new Date().toISOString();
  const { data: turn, error } = await supabase
    .from("hot_seat_turns")
    .insert({
      account_id: input.accountId,
      current_level: level,
      current_prize: prizeForLevel(level),
      current_question_id: question.id,
      game_state_id: input.gameState.id,
      question_history: [question.id],
      room_id: input.roomId,
      status: "awaiting_answer",
      updated_at: now,
    })
    .select(turnSelect)
    .single();

  if (error) {
    throw error;
  }

  const { error: gameStateError } = await supabase
    .from("game_states")
    .update({
      current_hot_seat_turn_id: turn.id,
      updated_at: now,
    })
    .eq("id", input.gameState.id);

  if (gameStateError) {
    throw gameStateError;
  }

  await emitRoomEvent(supabase, {
    actorAccountId: input.accountId,
    eventType: "hot_seat_question_loaded",
      payload: { level, turnId: turn.id },
    roomId: input.roomId,
  });

  return normalizeTurn(turn as HotSeatTurnRow);
}

async function ensureTurn(supabase: SupabaseClient, roomId: string) {
  const room = await getRoom(supabase, roomId);

  if (!room) {
    return { error: "room_not_found" as const, gameState: null, room: null, turn: null };
  }

  if (room.status !== "hot_seat") {
    return { error: "not_hot_seat" as const, gameState: null, room, turn: null };
  }

  const gameState = await fetchGameState(supabase, roomId);

  if (!gameState || !gameState.hot_seat_account_id) {
    return { error: "game_state_not_found" as const, gameState: null, room, turn: null };
  }

  let turn = gameState.current_hot_seat_turn_id
    ? await fetchTurn(supabase, gameState.current_hot_seat_turn_id)
    : null;

  if (!turn || turn.account_id !== gameState.hot_seat_account_id) {
    turn = await fetchActiveTurn(supabase, {
      accountId: gameState.hot_seat_account_id,
      gameStateId: gameState.id,
    });
  }

  if (!turn) {
    turn = await createTurn(supabase, {
      accountId: gameState.hot_seat_account_id,
      gameState,
      roomId,
    });
  }

  if (!turn) {
    return { error: "question_bank_empty" as const, gameState, room, turn: null };
  }

  return { error: null, gameState, room, turn };
}

async function publicState(
  supabase: SupabaseClient,
  input: { gameState?: GameStateRow; turn: HotSeatTurnRow },
): Promise<PublicHotSeatState> {
  const question = await fetchQuestion(supabase, input.turn.current_question_id);
  const { data: account, error } = await supabase
    .from("accounts")
    .select("id, display_name")
    .eq("id", input.turn.account_id)
    .single();

  if (error) {
    throw error;
  }

  const revealed =
    input.turn.status === "revealed_correct" ||
    input.turn.status === "revealed_wrong" ||
    input.turn.status === "turn_complete";

  return {
    audiencePercentages: input.turn.audience_percentages,
    correctAnswer: revealed ? question.correct_answer : null,
    currentLevel: input.turn.current_level,
    currentPrize: input.turn.current_prize,
    finalAnswer: input.turn.final_answer,
    finalWinnings: input.turn.final_winnings,
    hotSeatPlayer: {
      accountId: account.id,
      displayName: account.display_name,
    },
    isCorrect: input.turn.is_correct,
    ladder: ladder(input.turn.current_level),
    levelsCompleted: input.turn.levels_completed,
    passAvailable: input.gameState
      ? input.gameState.eligible_account_ids.filter(
          (accountId) => accountId !== input.turn.account_id,
        ).length > 0
      : false,
    question: {
      answerA: question.answer_a,
      answerB: question.answer_b,
      answerC: question.answer_c,
      answerD: question.answer_d,
      category: question.category,
      id: question.id,
      level: question.level,
      prizeAmount: question.prize_amount,
      questionText: question.question_text,
    },
    questionsCorrect: input.turn.questions_correct,
    removedAnswers: input.turn.removed_answers,
    selectedAnswer: input.turn.selected_answer,
    status: input.turn.status,
    turnId: input.turn.id,
    used5050: input.turn.used_5050,
    usedAudience: input.turn.used_audience,
    usedPass: input.turn.used_pass,
  };
}

export async function getHotSeatState(
  supabase: SupabaseClient,
  input: { account: PublicAccount; roomId: string },
) {
  const result = await ensureTurn(supabase, input.roomId);

  if (result.error) {
    return { error: result.error, state: null };
  }

  const inRoom = result.room.players.some(
    (player) => player.accountId === input.account.id && !player.leftAt,
  );

  if (!inRoom) {
    return { error: "not_in_room" as const, state: null };
  }

  return {
    error: null,
    state: await publicState(supabase, { gameState: result.gameState, turn: result.turn }),
  };
}

export async function submitFinalAnswer(
  supabase: SupabaseClient,
  input: { account: PublicAccount; answer: AnswerKey; roomId: string },
) {
  const result = await ensureTurn(supabase, input.roomId);

  if (result.error) {
    return { error: result.error, state: null };
  }

  if (result.turn.account_id !== input.account.id) {
    return { error: "not_hot_seat_player" as const, state: null };
  }

  if (result.turn.status !== "awaiting_answer") {
    return {
      error: "answer_locked" as const,
      state: await publicState(supabase, { gameState: result.gameState, turn: result.turn }),
    };
  }

  if (result.turn.removed_answers.includes(input.answer)) {
    return {
      error: "answer_removed" as const,
      state: await publicState(supabase, { gameState: result.gameState, turn: result.turn }),
    };
  }

  const question = await fetchQuestion(supabase, result.turn.current_question_id);
  const correct = input.answer === question.correct_answer;
  const now = new Date().toISOString();
  const levelsCompleted = correct
    ? result.turn.current_level
    : result.turn.current_level - 1;
  const questionsCorrect = correct
    ? result.turn.questions_correct + 1
    : result.turn.questions_correct;
  const finishedMillion = correct && result.turn.current_level === 12;
  const finalWinnings = correct
    ? finishedMillion
      ? prizeForLevel(12)
      : null
    : safetyNetForCompletedLevels(levelsCompleted);
  const nextStatus: HotSeatTurnStatus = correct
    ? finishedMillion
      ? "turn_complete"
      : "revealed_correct"
    : "revealed_wrong";

  const { data: turn, error } = await supabase
    .from("hot_seat_turns")
    .update({
      answered_at: now,
      completed_at: finishedMillion ? now : null,
      final_answer: input.answer,
      final_winnings: finalWinnings,
      is_correct: correct,
      levels_completed: levelsCompleted,
      questions_correct: questionsCorrect,
      selected_answer: input.answer,
      status: nextStatus,
      updated_at: now,
    })
    .eq("id", result.turn.id)
    .select(turnSelect)
    .single();

  if (error) {
    throw error;
  }

  await emitRoomEvent(supabase, {
    actorAccountId: input.account.id,
    eventType: "hot_seat_answer_locked",
    payload: { correct, level: result.turn.current_level, turnId: result.turn.id },
    roomId: input.roomId,
  });

  return {
    error: null,
    state: await publicState(supabase, { gameState: result.gameState, turn: normalizeTurn(turn as HotSeatTurnRow) }),
  };
}

async function reloadTurn(supabase: SupabaseClient, turnId: string) {
  const turn = await fetchTurn(supabase, turnId);

  if (!turn) {
    throw new Error("Hot Seat turn disappeared during update.");
  }

  return turn;
}

async function replaceTurnQuestion(
  supabase: SupabaseClient,
  input: { level: number; turn: HotSeatTurnRow },
) {
  const nextQuestion = await pickQuestion(supabase, {
    excludeQuestionIds: input.turn.question_history,
    level: input.level,
  });

  if (!nextQuestion) {
    return { error: "question_bank_empty" as const, turn: null };
  }

  const { data: turn, error } = await supabase
    .from("hot_seat_turns")
    .update({
      answered_at: null,
      audience_percentages: null,
      current_level: input.level,
      current_prize: prizeForLevel(input.level),
      current_question_id: nextQuestion.id,
      final_answer: null,
      final_winnings: null,
      is_correct: null,
      question_history: [...input.turn.question_history, nextQuestion.id],
      removed_answers: [],
      selected_answer: null,
      status: "awaiting_answer",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.turn.id)
    .select(turnSelect)
    .single();

  if (error) {
    throw error;
  }

  return { error: null, turn: normalizeTurn(turn as HotSeatTurnRow) };
}

async function findOrCreateTurnForAccount(
  supabase: SupabaseClient,
  input: {
    accountId: string;
    gameState: GameStateRow;
    level: number;
    roomId: string;
  },
) {
  const existing = await fetchActiveTurn(supabase, {
    accountId: input.accountId,
    gameStateId: input.gameState.id,
  });

  if (existing) {
    return { error: null, turn: existing };
  }

  const turn = await createTurn(supabase, {
    accountId: input.accountId,
    gameState: input.gameState,
    level: input.level,
    roomId: input.roomId,
  });

  if (!turn) {
    return { error: "question_bank_empty" as const, turn: null };
  }

  return { error: null, turn };
}

export async function applyHotSeatLifeline(
  supabase: SupabaseClient,
  input: { account: PublicAccount; lifeline: Lifeline; roomId: string },
) {
  const result = await ensureTurn(supabase, input.roomId);

  if (result.error) {
    return { error: result.error, room: null, state: null };
  }

  if (result.turn.account_id !== input.account.id) {
    return { error: "not_hot_seat_player" as const, room: null, state: null };
  }

  if (result.turn.status !== "awaiting_answer") {
    return {
      error: "answer_locked" as const,
      room: null,
      state: await publicState(supabase, { gameState: result.gameState, turn: result.turn }),
    };
  }

  const question = await fetchQuestion(supabase, result.turn.current_question_id);
  const now = new Date().toISOString();

  if (input.lifeline === "5050") {
    if (result.turn.used_5050) {
      return {
        error: "lifeline_used" as const,
        room: null,
        state: await publicState(supabase, { gameState: result.gameState, turn: result.turn }),
      };
    }

    const wrongAnswers = answerKeys().filter(
      (answer) => answer !== question.correct_answer,
    );
    const keptWrong = shuffle(wrongAnswers)[0];
    const removedAnswers = wrongAnswers.filter((answer) => answer !== keptWrong);
    const audiencePercentages = result.turn.used_audience
      ? generateAudiencePercentages(question, { removedAnswers })
      : result.turn.audience_percentages;
    const { data: turn, error } = await supabase
      .from("hot_seat_turns")
      .update({
        audience_percentages: audiencePercentages,
        removed_answers: removedAnswers,
        selected_answer: removedAnswers.includes(result.turn.selected_answer as AnswerKey)
          ? null
          : result.turn.selected_answer,
        updated_at: now,
        used_5050: true,
      })
      .eq("id", result.turn.id)
      .select(turnSelect)
      .single();

    if (error) {
      throw error;
    }

    await emitRoomEvent(supabase, {
      actorAccountId: input.account.id,
      eventType: "hot_seat_lifeline_used",
      payload: { lifeline: "5050", turnId: result.turn.id },
      roomId: input.roomId,
    });

    return {
      error: null,
      room: await getRoom(supabase, input.roomId),
      state: await publicState(supabase, {
        gameState: result.gameState,
        turn: normalizeTurn(turn as HotSeatTurnRow),
      }),
    };
  }

  if (input.lifeline === "audience") {
    if (result.turn.used_audience) {
      return {
        error: "lifeline_used" as const,
        room: null,
        state: await publicState(supabase, { gameState: result.gameState, turn: result.turn }),
      };
    }

    const audiencePercentages = generateAudiencePercentages(question, {
      removedAnswers: result.turn.removed_answers,
    });
    const { data: turn, error } = await supabase
      .from("hot_seat_turns")
      .update({
        audience_percentages: audiencePercentages,
        updated_at: now,
        used_audience: true,
      })
      .eq("id", result.turn.id)
      .select(turnSelect)
      .single();

    if (error) {
      throw error;
    }

    await emitRoomEvent(supabase, {
      actorAccountId: input.account.id,
      eventType: "hot_seat_lifeline_used",
      payload: { lifeline: "audience", turnId: result.turn.id },
      roomId: input.roomId,
    });

    return {
      error: null,
      room: await getRoom(supabase, input.roomId),
      state: await publicState(supabase, {
        gameState: result.gameState,
        turn: normalizeTurn(turn as HotSeatTurnRow),
      }),
    };
  }

  if (result.turn.used_pass) {
    return {
      error: "lifeline_used" as const,
      room: null,
      state: await publicState(supabase, { gameState: result.gameState, turn: result.turn }),
    };
  }

  const remainingQueue = result.gameState.eligible_account_ids.filter(
    (accountId) => accountId !== result.turn.account_id,
  );

  if (remainingQueue.length === 0) {
    return {
      error: "pass_unavailable" as const,
      room: null,
      state: await publicState(supabase, { gameState: result.gameState, turn: result.turn }),
    };
  }

  const refreshedPasser = await replaceTurnQuestion(supabase, {
    level: result.turn.current_level,
    turn: {
      ...result.turn,
      used_pass: true,
    },
  });

  if (refreshedPasser.error || !refreshedPasser.turn) {
    return { error: refreshedPasser.error, room: null, state: null };
  }

  const { error: passUpdateError } = await supabase
    .from("hot_seat_turns")
    .update({
      pass_queue_snapshot: {
        after: [...remainingQueue, result.turn.account_id],
        before: result.gameState.eligible_account_ids,
        passedAt: now,
      },
      updated_at: now,
      used_pass: true,
    })
    .eq("id", refreshedPasser.turn.id);

  if (passUpdateError) {
    throw passUpdateError;
  }

  const nextAccountId = remainingQueue[0];
  const nextTurnResult = await findOrCreateTurnForAccount(supabase, {
    accountId: nextAccountId,
    gameState: result.gameState,
    level: result.turn.current_level,
    roomId: input.roomId,
  });

  if (nextTurnResult.error || !nextTurnResult.turn) {
    return { error: nextTurnResult.error, room: null, state: null };
  }

  const nextQueue = [...remainingQueue, result.turn.account_id];
  const { error: gameStateError } = await supabase
    .from("game_states")
    .update({
      current_hot_seat_turn_id: nextTurnResult.turn.id,
      eligible_account_ids: nextQueue,
      hot_seat_account_id: nextAccountId,
      updated_at: now,
    })
    .eq("id", result.gameState.id);

  if (gameStateError) {
    throw gameStateError;
  }

  await emitRoomEvent(supabase, {
    actorAccountId: input.account.id,
    eventType: "hot_seat_lifeline_used",
    payload: {
      lifeline: "pass",
      nextAccountId,
      queue: nextQueue,
      turnId: result.turn.id,
    },
    roomId: input.roomId,
  });
  await emitRoomEvent(supabase, {
    actorAccountId: nextAccountId,
    eventType: "hot_seat_question_loaded",
    payload: { level: nextTurnResult.turn.current_level, turnId: nextTurnResult.turn.id },
    roomId: input.roomId,
  });

  return {
    error: null,
    room: await getRoom(supabase, input.roomId),
    state: await publicState(supabase, {
      gameState: {
        ...result.gameState,
        current_hot_seat_turn_id: nextTurnResult.turn.id,
        eligible_account_ids: nextQueue,
        hot_seat_account_id: nextAccountId,
      },
      turn: await reloadTurn(supabase, nextTurnResult.turn.id),
    }),
  };
}

async function finishTurnAndAdvance(
  supabase: SupabaseClient,
  input: { gameState: GameStateRow; roomId: string; turn: HotSeatTurnRow },
) {
  const now = new Date().toISOString();
  const completedIds = [
    ...new Set([...input.gameState.completed_turn_account_ids, input.turn.account_id]),
  ];
  const remainingEligible = input.gameState.join_order.filter(
    (accountId) => !completedIds.includes(accountId),
  );

  if (input.turn.status !== "turn_complete") {
    const finalWinnings =
      input.turn.final_winnings ?? safetyNetForCompletedLevels(input.turn.levels_completed);
    const { error: turnError } = await supabase
      .from("hot_seat_turns")
      .update({
        completed_at: now,
        final_winnings: finalWinnings,
        status: "turn_complete",
        updated_at: now,
      })
      .eq("id", input.turn.id);

    if (turnError) {
      throw turnError;
    }
  }

  if (remainingEligible.length === 0) {
    const { error: roomError } = await supabase
      .from("rooms")
      .update({ status: "completed", updated_at: now })
      .eq("id", input.roomId);

    if (roomError) {
      throw roomError;
    }

    const { error: stateError } = await supabase
      .from("game_states")
      .update({
        completed_turn_account_ids: completedIds,
        current_hot_seat_turn_id: input.turn.id,
        current_room_status: "completed",
        eligible_account_ids: [],
        hot_seat_account_id: null,
        updated_at: now,
      })
      .eq("id", input.gameState.id);

    if (stateError) {
      throw stateError;
    }

    await emitRoomEvent(supabase, {
      actorAccountId: input.turn.account_id,
      eventType: "hot_seat_turn_completed",
      payload: { final: true, turnId: input.turn.id },
      roomId: input.roomId,
    });
    await emitRoomEvent(supabase, {
      actorAccountId: input.turn.account_id,
      eventType: "room_status_changed",
      payload: { status: "completed" },
      roomId: input.roomId,
    });
    return;
  }

  const { error: roomError } = await supabase
    .from("rooms")
    .update({ status: "fastest_finger", updated_at: now })
    .eq("id", input.roomId);

  if (roomError) {
    throw roomError;
  }

  const { error: stateError } = await supabase
    .from("game_states")
    .update({
      completed_turn_account_ids: completedIds,
      current_fastest_finger_round_id: null,
      current_hot_seat_turn_id: null,
      current_room_status: "fastest_finger",
      eligible_account_ids: remainingEligible,
      fastest_finger_winner_account_id: null,
      hot_seat_account_id: null,
      updated_at: now,
    })
    .eq("id", input.gameState.id);

  if (stateError) {
    throw stateError;
  }

  await emitRoomEvent(supabase, {
    actorAccountId: input.turn.account_id,
    eventType: "hot_seat_turn_completed",
    payload: { final: false, turnId: input.turn.id },
    roomId: input.roomId,
  });
  await emitRoomEvent(supabase, {
    actorAccountId: input.turn.account_id,
    eventType: "room_status_changed",
    payload: { status: "fastest_finger" },
    roomId: input.roomId,
  });
}

export async function continueHotSeat(
  supabase: SupabaseClient,
  input: { account: PublicAccount; roomId: string },
) {
  const result = await ensureTurn(supabase, input.roomId);

  if (result.error) {
    return { error: result.error, room: null, state: null };
  }

  if (result.turn.account_id !== input.account.id) {
    return { error: "not_hot_seat_player" as const, room: null, state: null };
  }

  if (result.turn.status === "awaiting_answer") {
    return { error: "answer_required" as const, room: null, state: null };
  }

  if (result.turn.status === "revealed_correct") {
    const nextLevel = result.turn.current_level + 1;
    const nextQuestion = await pickQuestion(supabase, {
      excludeQuestionIds: result.turn.question_history,
      level: nextLevel,
    });

    if (!nextQuestion) {
      return { error: "question_bank_empty" as const, room: null, state: null };
    }

    const now = new Date().toISOString();
    const { data: turn, error } = await supabase
      .from("hot_seat_turns")
      .update({
        answered_at: null,
        current_level: nextLevel,
        current_prize: prizeForLevel(nextLevel),
        current_question_id: nextQuestion.id,
        final_answer: null,
        final_winnings: null,
        is_correct: null,
        audience_percentages: null,
        question_history: [...result.turn.question_history, nextQuestion.id],
        removed_answers: [],
        selected_answer: null,
        status: "awaiting_answer",
        updated_at: now,
      })
      .eq("id", result.turn.id)
      .select(turnSelect)
      .single();

    if (error) {
      throw error;
    }

    await emitRoomEvent(supabase, {
      actorAccountId: input.account.id,
      eventType: "hot_seat_question_loaded",
      payload: { level: nextLevel, turnId: result.turn.id },
      roomId: input.roomId,
    });

    return {
      error: null,
      room: await getRoom(supabase, input.roomId),
      state: await publicState(supabase, { gameState: result.gameState, turn: normalizeTurn(turn as HotSeatTurnRow) }),
    };
  }

  await finishTurnAndAdvance(supabase, {
    gameState: result.gameState,
    roomId: input.roomId,
    turn: result.turn,
  });

  return {
    error: null,
    room: await getRoom(supabase, input.roomId),
    state: null,
  };
}

