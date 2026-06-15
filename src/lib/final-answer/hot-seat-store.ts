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
  selectedAnswer: AnswerKey | null;
  status: HotSeatTurnStatus;
  turnId: string;
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
  question_history: string[];
  questions_correct: number;
  room_id: string;
  selected_answer: AnswerKey | null;
  status: HotSeatTurnStatus;
};

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
    .select(
      "id, room_id, game_state_id, account_id, current_level, current_prize, current_question_id, question_history, selected_answer, final_answer, status, is_correct, final_winnings, levels_completed, questions_correct, answered_at, completed_at",
    )
    .eq("id", turnId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as HotSeatTurnRow | null;
}

async function fetchActiveTurn(
  supabase: SupabaseClient,
  input: { accountId: string; gameStateId: string },
) {
  const { data, error } = await supabase
    .from("hot_seat_turns")
    .select(
      "id, room_id, game_state_id, account_id, current_level, current_prize, current_question_id, question_history, selected_answer, final_answer, status, is_correct, final_winnings, levels_completed, questions_correct, answered_at, completed_at",
    )
    .eq("game_state_id", input.gameStateId)
    .eq("account_id", input.accountId)
    .neq("status", "turn_complete")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as HotSeatTurnRow | null;
}

async function createTurn(
  supabase: SupabaseClient,
  input: { accountId: string; gameState: GameStateRow; roomId: string },
) {
  const question = await pickQuestion(supabase, {
    excludeQuestionIds: [],
    level: 1,
  });

  if (!question) {
    return null;
  }

  const now = new Date().toISOString();
  const { data: turn, error } = await supabase
    .from("hot_seat_turns")
    .insert({
      account_id: input.accountId,
      current_level: 1,
      current_prize: prizeForLevel(1),
      current_question_id: question.id,
      game_state_id: input.gameState.id,
      question_history: [question.id],
      room_id: input.roomId,
      status: "awaiting_answer",
      updated_at: now,
    })
    .select(
      "id, room_id, game_state_id, account_id, current_level, current_prize, current_question_id, question_history, selected_answer, final_answer, status, is_correct, final_winnings, levels_completed, questions_correct, answered_at, completed_at",
    )
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
    payload: { level: 1, turnId: turn.id },
    roomId: input.roomId,
  });

  return turn as HotSeatTurnRow;
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
  input: { turn: HotSeatTurnRow },
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
    selectedAnswer: input.turn.selected_answer,
    status: input.turn.status,
    turnId: input.turn.id,
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
    state: await publicState(supabase, { turn: result.turn }),
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
      state: await publicState(supabase, { turn: result.turn }),
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
    .select(
      "id, room_id, game_state_id, account_id, current_level, current_prize, current_question_id, question_history, selected_answer, final_answer, status, is_correct, final_winnings, levels_completed, questions_correct, answered_at, completed_at",
    )
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
    state: await publicState(supabase, { turn: turn as HotSeatTurnRow }),
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
        question_history: [...result.turn.question_history, nextQuestion.id],
        selected_answer: null,
        status: "awaiting_answer",
        updated_at: now,
      })
      .eq("id", result.turn.id)
      .select(
        "id, room_id, game_state_id, account_id, current_level, current_prize, current_question_id, question_history, selected_answer, final_answer, status, is_correct, final_winnings, levels_completed, questions_correct, answered_at, completed_at",
      )
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
      state: await publicState(supabase, { turn: turn as HotSeatTurnRow }),
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
