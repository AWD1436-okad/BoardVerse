import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicAccount } from "./auth";
import { emitRoomEvent, getRoom } from "./room-store";
import { starterFastestFingerQuestions } from "./starter-fastest-finger-questions";

const fastestFingerMs = 30_000;
const itemKeys = ["item_1", "item_2", "item_3", "item_4"] as const;

export type FastestFingerItemKey = (typeof itemKeys)[number];

export type PublicFastestFingerState = {
  endsAt: string;
  eligiblePlayerCount: number;
  items: Array<{ key: FastestFingerItemKey; text: string }>;
  prompt: string;
  roundId: string;
  roundNumber: number;
  serverNow: string;
  startsAt: string;
  status: "active" | "completed";
  submission: {
    isCorrect: boolean;
    responseMs: number;
    submittedAt: string;
    submittedOrder: FastestFingerItemKey[];
  } | null;
  submissionCount: number;
  winner: {
    accountId: string;
    displayName: string;
  } | null;
};

type FastestFingerQuestionRow = {
  category: string;
  correct_order: FastestFingerItemKey[];
  id: string;
  item_1: string;
  item_2: string;
  item_3: string;
  item_4: string;
  prompt: string;
};

type FastestFingerRoundRow = {
  completed_at: string | null;
  ends_at: string;
  game_state_id: string;
  id: string;
  question_id: string;
  room_id: string;
  round_number: number;
  starts_at: string;
  status: "active" | "completed";
  winner_account_id: string | null;
};

type FastestFingerSubmissionRow = {
  account_id: string;
  is_correct: boolean;
  response_ms: number;
  submitted_at: string;
  submitted_order: FastestFingerItemKey[];
};

type GameStateRow = {
  current_fastest_finger_round_id: string | null;
  current_room_status: "starting" | "fastest_finger" | "hot_seat" | "completed";
  eligible_account_ids: string[];
  id: string;
  room_id: string;
};

export function validateFastestFingerOrder(value: unknown) {
  if (!Array.isArray(value) || value.length !== 4) {
    return { message: "Submit all four answers in order.", ok: false } as const;
  }

  const submitted = value.map(String);
  const unique = new Set(submitted);

  if (
    unique.size !== 4 ||
    !submitted.every((item): item is FastestFingerItemKey =>
      itemKeys.includes(item as FastestFingerItemKey),
    )
  ) {
    return { message: "Submitted order is not valid.", ok: false } as const;
  }

  return { ok: true, submitted } as const;
}

function isSameOrder(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function publicQuestionItems(question: FastestFingerQuestionRow) {
  return itemKeys.map((key) => ({
    key,
    text: question[key],
  }));
}

async function fetchGameState(supabase: SupabaseClient, roomId: string) {
  const { data, error } = await supabase
    .from("game_states")
    .select(
      "id, room_id, current_room_status, current_fastest_finger_round_id, eligible_account_ids",
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
    .from("fastest_finger_questions")
    .select("id, prompt, item_1, item_2, item_3, item_4, correct_order, category")
    .eq("id", questionId)
    .single();

  if (error) {
    throw error;
  }

  return data as FastestFingerQuestionRow;
}

async function fetchRound(supabase: SupabaseClient, roundId: string) {
  const { data, error } = await supabase
    .from("fastest_finger_rounds")
    .select(
      "id, room_id, game_state_id, question_id, round_number, starts_at, ends_at, status, winner_account_id, completed_at",
    )
    .eq("id", roundId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as FastestFingerRoundRow | null;
}

async function fetchLatestRound(supabase: SupabaseClient, roomId: string) {
  const { data, error } = await supabase
    .from("fastest_finger_rounds")
    .select(
      "id, room_id, game_state_id, question_id, round_number, starts_at, ends_at, status, winner_account_id, completed_at",
    )
    .eq("room_id", roomId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as FastestFingerRoundRow | null;
}

async function fetchSubmissions(supabase: SupabaseClient, roundId: string) {
  const { data, error } = await supabase
    .from("fastest_finger_submissions")
    .select("account_id, submitted_order, is_correct, response_ms, submitted_at")
    .eq("round_id", roundId)
    .order("response_ms", { ascending: true })
    .order("submitted_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as FastestFingerSubmissionRow[];
}

async function createRound(
  supabase: SupabaseClient,
  input: {
    gameState: GameStateRow;
    roomId: string;
  },
) {
  const { data: questions, error: questionsError } = await supabase
    .from("fastest_finger_questions")
    .select("id")
    .eq("active", true);

  if (questionsError) {
    throw questionsError;
  }

  if (!questions?.length) {
    return null;
  }

  const latestRound = await fetchLatestRound(supabase, input.roomId);
  const usedQuestionIds = new Set<string>();
  const { data: previousRounds, error: previousRoundsError } = await supabase
    .from("fastest_finger_rounds")
    .select("question_id")
    .eq("room_id", input.roomId);

  if (previousRoundsError) {
    throw previousRoundsError;
  }

  for (const round of previousRounds ?? []) {
    usedQuestionIds.add(String(round.question_id));
  }

  const available = questions.filter((question) => !usedQuestionIds.has(question.id));
  const questionPool = available.length ? available : questions;
  const question = questionPool[Math.floor(Math.random() * questionPool.length)];
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + fastestFingerMs);
  const roundNumber = (latestRound?.round_number ?? 0) + 1;

  const { data: round, error: roundError } = await supabase
    .from("fastest_finger_rounds")
    .insert({
      ends_at: endsAt.toISOString(),
      game_state_id: input.gameState.id,
      question_id: question.id,
      room_id: input.roomId,
      round_number: roundNumber,
      starts_at: startsAt.toISOString(),
      status: "active",
    })
    .select(
      "id, room_id, game_state_id, question_id, round_number, starts_at, ends_at, status, winner_account_id, completed_at",
    )
    .single();

  if (roundError) {
    throw roundError;
  }

  const { error: gameStateError } = await supabase
    .from("game_states")
    .update({
      current_fastest_finger_round_id: round.id,
      current_room_status: "fastest_finger",
      updated_at: startsAt.toISOString(),
    })
    .eq("id", input.gameState.id);

  if (gameStateError) {
    throw gameStateError;
  }

  await emitRoomEvent(supabase, {
    eventType: "fastest_finger_round_started",
    payload: { roundId: round.id, roundNumber },
    roomId: input.roomId,
  });

  return round as FastestFingerRoundRow;
}

async function ensureRound(supabase: SupabaseClient, roomId: string) {
  const room = await getRoom(supabase, roomId);

  if (!room) {
    return { error: "room_not_found" as const, room: null, round: null };
  }

  if (room.status !== "fastest_finger" && room.status !== "hot_seat") {
    return { error: "not_fastest_finger" as const, room, round: null };
  }

  const gameState = await fetchGameState(supabase, roomId);

  if (!gameState) {
    return { error: "game_state_not_found" as const, room, round: null };
  }

  let round = gameState.current_fastest_finger_round_id
    ? await fetchRound(supabase, gameState.current_fastest_finger_round_id)
    : null;

  if (!round) {
    round = await fetchLatestRound(supabase, roomId);
  }

  if (room.status === "fastest_finger" && (!round || round.status === "completed")) {
    round = await createRound(supabase, { gameState, roomId });
  }

  if (!round) {
    return { error: "question_bank_empty" as const, room, round: null };
  }

  return { error: null, gameState, room, round };
}

async function settleRoundIfReady(
  supabase: SupabaseClient,
  input: {
    gameState: GameStateRow;
    round: FastestFingerRoundRow;
  },
) {
  if (input.round.status === "completed") {
    return input.round;
  }

  const submissions = await fetchSubmissions(supabase, input.round.id);
  const eligibleCount = input.gameState.eligible_account_ids.length;
  const timerEnded = Date.now() >= new Date(input.round.ends_at).getTime();
  const allSubmitted = submissions.length >= eligibleCount;

  if (!timerEnded && !allSubmitted) {
    return input.round;
  }

  const winner = submissions.find((submission) => submission.is_correct);
  const completedAt = new Date().toISOString();

  const { data: completedRound, error: roundError } = await supabase
    .from("fastest_finger_rounds")
    .update({
      completed_at: completedAt,
      status: "completed",
      winner_account_id: winner?.account_id ?? null,
    })
    .eq("id", input.round.id)
    .select(
      "id, room_id, game_state_id, question_id, round_number, starts_at, ends_at, status, winner_account_id, completed_at",
    )
    .single();

  if (roundError) {
    throw roundError;
  }

  if (!winner) {
    return completedRound as FastestFingerRoundRow;
  }

  const { error: roomError } = await supabase
    .from("rooms")
    .update({
      status: "hot_seat",
      updated_at: completedAt,
    })
    .eq("id", input.round.room_id);

  if (roomError) {
    throw roomError;
  }

  const { error: gameStateError } = await supabase
    .from("game_states")
    .update({
      current_room_status: "hot_seat",
      fastest_finger_winner_account_id: winner.account_id,
      hot_seat_account_id: winner.account_id,
      updated_at: completedAt,
    })
    .eq("id", input.gameState.id);

  if (gameStateError) {
    throw gameStateError;
  }

  await emitRoomEvent(supabase, {
    actorAccountId: winner.account_id,
    eventType: "fastest_finger_winner",
    payload: { roundId: input.round.id, winnerAccountId: winner.account_id },
    roomId: input.round.room_id,
  });
  await emitRoomEvent(supabase, {
    actorAccountId: winner.account_id,
    eventType: "room_status_changed",
    payload: { status: "hot_seat" },
    roomId: input.round.room_id,
  });

  return completedRound as FastestFingerRoundRow;
}

async function publicState(
  supabase: SupabaseClient,
  input: {
    account: PublicAccount;
    gameState: GameStateRow;
    roomId: string;
    round: FastestFingerRoundRow;
  },
): Promise<PublicFastestFingerState> {
  const question = await fetchQuestion(supabase, input.round.question_id);
  const submissions = await fetchSubmissions(supabase, input.round.id);
  const ownSubmission =
    submissions.find((submission) => submission.account_id === input.account.id) ?? null;

  let winner: PublicFastestFingerState["winner"] = null;

  if (input.round.winner_account_id) {
    const { data: account, error } = await supabase
      .from("accounts")
      .select("id, display_name")
      .eq("id", input.round.winner_account_id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (account) {
      winner = {
        accountId: account.id,
        displayName: account.display_name,
      };
    }
  }

  return {
    eligiblePlayerCount: input.gameState.eligible_account_ids.length,
    endsAt: input.round.ends_at,
    items: publicQuestionItems(question),
    prompt: question.prompt,
    roundId: input.round.id,
    roundNumber: input.round.round_number,
    serverNow: new Date().toISOString(),
    startsAt: input.round.starts_at,
    status: input.round.status,
    submission: ownSubmission
      ? {
          isCorrect: ownSubmission.is_correct,
          responseMs: ownSubmission.response_ms,
          submittedAt: ownSubmission.submitted_at,
          submittedOrder: ownSubmission.submitted_order,
        }
      : null,
    submissionCount: submissions.length,
    winner,
  };
}

export async function getFastestFingerState(
  supabase: SupabaseClient,
  input: { account: PublicAccount; roomId: string },
) {
  const result = await ensureRound(supabase, input.roomId);

  if (result.error) {
    return { error: result.error, state: null };
  }

  if (!result.gameState.eligible_account_ids.includes(input.account.id)) {
    return { error: "not_eligible" as const, state: null };
  }

  let round = await settleRoundIfReady(supabase, {
    gameState: result.gameState,
    round: result.round,
  });

  if (round.status === "completed" && !round.winner_account_id) {
    const refreshedGameState = await fetchGameState(supabase, input.roomId);

    if (!refreshedGameState) {
      return { error: "game_state_not_found" as const, state: null };
    }

    const nextRound = await createRound(supabase, {
      gameState: refreshedGameState,
      roomId: input.roomId,
    });

    if (!nextRound) {
      return { error: "question_bank_empty" as const, state: null };
    }

    round = nextRound;
    result.gameState = refreshedGameState;
  }

  return {
    error: null,
    state: await publicState(supabase, {
      account: input.account,
      gameState: result.gameState,
      roomId: input.roomId,
      round,
    }),
  };
}

export async function submitFastestFingerOrder(
  supabase: SupabaseClient,
  input: {
    account: PublicAccount;
    roomId: string;
    submittedOrder: FastestFingerItemKey[];
  },
) {
  const result = await ensureRound(supabase, input.roomId);

  if (result.error) {
    return { error: result.error, state: null };
  }

  if (!result.gameState.eligible_account_ids.includes(input.account.id)) {
    return { error: "not_eligible" as const, state: null };
  }

  let round = await settleRoundIfReady(supabase, {
    gameState: result.gameState,
    round: result.round,
  });

  if (round.status !== "active") {
    return {
      error: "round_closed" as const,
      state: await publicState(supabase, {
        account: input.account,
        gameState: result.gameState,
        roomId: input.roomId,
        round,
      }),
    };
  }

  const now = new Date();

  if (now.getTime() > new Date(round.ends_at).getTime()) {
    round = await settleRoundIfReady(supabase, {
      gameState: result.gameState,
      round,
    });

    return {
      error: "round_closed" as const,
      state: await publicState(supabase, {
        account: input.account,
        gameState: result.gameState,
        roomId: input.roomId,
        round,
      }),
    };
  }

  const question = await fetchQuestion(supabase, round.question_id);
  const responseMs = Math.max(
    0,
    now.getTime() - new Date(round.starts_at).getTime(),
  );
  const isCorrect = isSameOrder(input.submittedOrder, question.correct_order);
  const { error: insertError } = await supabase
    .from("fastest_finger_submissions")
    .insert({
      account_id: input.account.id,
      is_correct: isCorrect,
      response_ms: responseMs,
      round_id: round.id,
      submitted_order: input.submittedOrder,
      submitted_at: now.toISOString(),
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        error: "already_submitted" as const,
        state: await publicState(supabase, {
          account: input.account,
          gameState: result.gameState,
          roomId: input.roomId,
          round,
        }),
      };
    }

    throw insertError;
  }

  await emitRoomEvent(supabase, {
    actorAccountId: input.account.id,
    eventType: "fastest_finger_submitted",
    payload: { roundId: round.id },
    roomId: input.roomId,
  });

  round = await settleRoundIfReady(supabase, {
    gameState: result.gameState,
    round,
  });

  if (round.status === "completed" && !round.winner_account_id) {
    const refreshedGameState = await fetchGameState(supabase, input.roomId);

    if (!refreshedGameState) {
      return { error: "game_state_not_found" as const, state: null };
    }

    const nextRound = await createRound(supabase, {
      gameState: refreshedGameState,
      roomId: input.roomId,
    });

    if (!nextRound) {
      return { error: "question_bank_empty" as const, state: null };
    }

    return {
      error: null,
      state: await publicState(supabase, {
        account: input.account,
        gameState: refreshedGameState,
        roomId: input.roomId,
        round: nextRound,
      }),
    };
  }

  return {
    error: null,
    state: await publicState(supabase, {
      account: input.account,
      gameState: result.gameState,
      roomId: input.roomId,
      round,
    }),
  };
}

export async function seedStarterFastestFingerQuestions(supabase: SupabaseClient) {
  const rows = starterFastestFingerQuestions;
  const chunkSize = 50;
  let seeded = 0;

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from("fastest_finger_questions").upsert(chunk, {
      onConflict: "prompt",
    });

    if (error) {
      throw error;
    }

    seeded += chunk.length;
  }

  return {
    categories: [...new Set(rows.map((row) => row.category))].sort(),
    total: seeded,
  };
}
