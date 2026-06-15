import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicAccount } from "./auth";
import { getRoom } from "./room-store";

type RoomResultRow = {
  account_id: string;
  completed_at: string;
  display_name: string;
  fastest_finger_wins: number;
  final_winnings: number;
  highest_level_reached: number;
  placement: number;
  questions_answered_correctly: number;
  tied_for_first: boolean;
  won_outright: boolean;
};

type HotSeatResultTurn = {
  account_id: string;
  completed_at: string | null;
  final_winnings: number | null;
  levels_completed: number;
  current_level: number;
  questions_correct: number;
};

type AccountRow = {
  display_name: string;
  id: string;
};

type StatsRow = {
  fastest_finger_wins: number;
  games_played: number;
  highest_prize_won: number;
  questions_answered_correctly: number;
  ties: number;
  total_money_won: number;
  wins: number;
};

export type PublicGameResult = {
  accountId: string;
  completedAt: string;
  displayName: string;
  fastestFingerWins: number;
  finalWinnings: number;
  highestLevelReached: number;
  placement: number;
  questionsAnsweredCorrectly: number;
  tiedForFirst: boolean;
  wonOutright: boolean;
};

function toPublicResult(row: RoomResultRow): PublicGameResult {
  return {
    accountId: row.account_id,
    completedAt: row.completed_at,
    displayName: row.display_name,
    fastestFingerWins: row.fastest_finger_wins,
    finalWinnings: row.final_winnings,
    highestLevelReached: row.highest_level_reached,
    placement: row.placement,
    questionsAnsweredCorrectly: row.questions_answered_correctly,
    tiedForFirst: row.tied_for_first,
    wonOutright: row.won_outright,
  };
}

async function fetchStoredResults(supabase: SupabaseClient, roomId: string) {
  const { data, error } = await supabase
    .from("game_results")
    .select(
      "account_id, display_name, final_winnings, highest_level_reached, questions_answered_correctly, fastest_finger_wins, won_outright, tied_for_first, placement, completed_at",
    )
    .eq("room_id", roomId)
    .order("placement", { ascending: true })
    .order("final_winnings", { ascending: false })
    .order("display_name", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as RoomResultRow[]).map(toPublicResult);
}

function rankRows(
  rows: Array<
    Omit<RoomResultRow, "placement" | "tied_for_first" | "won_outright">
  >,
) {
  const sorted = [...rows].sort((a, b) => {
    if (b.final_winnings !== a.final_winnings) {
      return b.final_winnings - a.final_winnings;
    }

    return a.display_name.localeCompare(b.display_name);
  });
  const topScore = sorted[0]?.final_winnings ?? 0;
  const topCount = sorted.filter((row) => row.final_winnings === topScore).length;
  let previousWinnings: number | null = null;
  let previousPlacement = 0;

  return sorted.map((row, index) => {
    const placement =
      previousWinnings === row.final_winnings ? previousPlacement : index + 1;

    previousWinnings = row.final_winnings;
    previousPlacement = placement;

    return {
      ...row,
      placement,
      tied_for_first: row.final_winnings === topScore && topCount > 1,
      won_outright: row.final_winnings === topScore && topCount === 1,
    };
  });
}

async function updateStatsOnce(
  supabase: SupabaseClient,
  result: ReturnType<typeof rankRows>[number],
) {
  const { data: stats, error } = await supabase
    .from("account_stats")
    .select(
      "games_played, wins, ties, highest_prize_won, total_money_won, fastest_finger_wins, questions_answered_correctly",
    )
    .eq("account_id", result.account_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const current = (stats as StatsRow | null) ?? {
    fastest_finger_wins: 0,
    games_played: 0,
    highest_prize_won: 0,
    questions_answered_correctly: 0,
    ties: 0,
    total_money_won: 0,
    wins: 0,
  };

  const nextStats = {
    account_id: result.account_id,
    fastest_finger_wins:
      current.fastest_finger_wins + result.fastest_finger_wins,
    games_played: current.games_played + 1,
    highest_prize_won: Math.max(
      current.highest_prize_won,
      result.final_winnings,
    ),
    questions_answered_correctly:
      current.questions_answered_correctly + result.questions_answered_correctly,
    ties: current.ties + (result.tied_for_first ? 1 : 0),
    total_money_won: current.total_money_won + result.final_winnings,
    updated_at: new Date().toISOString(),
    wins: current.wins + (result.won_outright ? 1 : 0),
  };

  const { error: upsertError } = await supabase
    .from("account_stats")
    .upsert(nextStats, { onConflict: "account_id" });

  if (upsertError) {
    throw upsertError;
  }
}

async function finalizeResults(supabase: SupabaseClient, roomId: string) {
  const now = new Date().toISOString();
  const { data: locked, error: lockError } = await supabase
    .from("rooms")
    .update({ results_finalized_at: now, updated_at: now })
    .eq("id", roomId)
    .is("results_finalized_at", null)
    .select("id")
    .maybeSingle();

  if (lockError) {
    throw lockError;
  }

  if (!locked) {
    return fetchStoredResults(supabase, roomId);
  }

  const { data: turns, error: turnError } = await supabase
    .from("hot_seat_turns")
    .select(
      "account_id, final_winnings, levels_completed, current_level, questions_correct, completed_at",
    )
    .eq("room_id", roomId)
    .eq("status", "turn_complete");

  if (turnError) {
    throw turnError;
  }

  const completedTurns = (turns ?? []) as HotSeatResultTurn[];
  const accountIds = completedTurns.map((turn) => turn.account_id);

  if (!accountIds.length) {
    return [];
  }

  const { data: accounts, error: accountError } = await supabase
    .from("accounts")
    .select("id, display_name")
    .in("id", accountIds);

  if (accountError) {
    throw accountError;
  }

  const accountById = new Map(
    ((accounts ?? []) as AccountRow[]).map((account) => [account.id, account]),
  );
  const { data: fastestRounds, error: fastestError } = await supabase
    .from("fastest_finger_rounds")
    .select("winner_account_id")
    .eq("room_id", roomId)
    .not("winner_account_id", "is", null);

  if (fastestError) {
    throw fastestError;
  }

  const fastestWins = new Map<string, number>();
  for (const round of (fastestRounds ?? []) as Array<{
    winner_account_id: string | null;
  }>) {
    if (round.winner_account_id) {
      fastestWins.set(
        round.winner_account_id,
        (fastestWins.get(round.winner_account_id) ?? 0) + 1,
      );
    }
  }

  const rankedRows = rankRows(
    completedTurns.map((turn) => ({
      account_id: turn.account_id,
      completed_at: turn.completed_at ?? now,
      display_name: accountById.get(turn.account_id)?.display_name ?? "Player",
      fastest_finger_wins: fastestWins.get(turn.account_id) ?? 0,
      final_winnings: turn.final_winnings ?? 0,
      highest_level_reached: Math.max(
        turn.current_level,
        turn.levels_completed,
      ),
      questions_answered_correctly: turn.questions_correct,
    })),
  );

  const { error: insertError } = await supabase.from("game_results").upsert(
    rankedRows.map((row) => ({
      account_id: row.account_id,
      completed_at: row.completed_at,
      display_name: row.display_name,
      fastest_finger_wins: row.fastest_finger_wins,
      final_winnings: row.final_winnings,
      highest_level_reached: row.highest_level_reached,
      placement: row.placement,
      questions_answered_correctly: row.questions_answered_correctly,
      room_id: roomId,
      tied_for_first: row.tied_for_first,
      won_outright: row.won_outright,
    })),
    { onConflict: "room_id,account_id" },
  );

  if (insertError) {
    throw insertError;
  }

  for (const result of rankedRows) {
    await updateStatsOnce(supabase, result);
  }

  const { error: placementError } = await Promise.all(
    rankedRows.map((row) =>
      supabase
        .from("hot_seat_turns")
        .update({ placement_rank: row.placement, updated_at: now })
        .eq("room_id", roomId)
        .eq("account_id", row.account_id),
    ),
  ).then((responses) => ({
    error: responses.find((response) => response.error)?.error,
  }));

  if (placementError) {
    throw placementError;
  }

  return fetchStoredResults(supabase, roomId);
}

export async function getGameResults(
  supabase: SupabaseClient,
  input: { account: PublicAccount; roomId: string },
) {
  const room = await getRoom(supabase, input.roomId);

  if (!room) {
    return { error: "room_not_found" as const, results: [] };
  }

  const inRoom = room.players.some(
    (player) => player.accountId === input.account.id,
  );

  if (!inRoom) {
    return { error: "not_in_room" as const, results: [] };
  }

  if (room.status !== "completed") {
    return { error: "not_completed" as const, results: [] };
  }

  const existing = await fetchStoredResults(supabase, input.roomId);

  if (existing.length) {
    return { error: null, results: existing };
  }

  return { error: null, results: await finalizeResults(supabase, input.roomId) };
}
