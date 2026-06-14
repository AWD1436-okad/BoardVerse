import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSessionToken,
  defaultStats,
  hashPin,
  hashSessionToken,
  lockoutMinutes,
  maxFailedAttempts,
  type PublicAccount,
  sessionMaxAgeSeconds,
  verifyPin,
} from "./auth";

type AccountRow = {
  created_at: string;
  display_name: string;
  id: string;
  pin_hash: string;
  username: string;
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

type AttemptRow = {
  failed_count: number;
  locked_until: string | null;
};

function publicAccount(account: AccountRow, stats?: StatsRow | null): PublicAccount {
  return {
    createdAt: account.created_at,
    displayName: account.display_name,
    id: account.id,
    stats: stats
      ? {
          fastestFingerWins: stats.fastest_finger_wins,
          gamesPlayed: stats.games_played,
          highestPrizeWon: stats.highest_prize_won,
          questionsAnsweredCorrectly: stats.questions_answered_correctly,
          ties: stats.ties,
          totalMoneyWon: stats.total_money_won,
          wins: stats.wins,
        }
      : defaultStats(),
    username: account.username,
  };
}

async function getAttempt(
  supabase: SupabaseClient,
  username: string,
): Promise<AttemptRow | null> {
  const { data, error } = await supabase
    .from("account_login_attempts")
    .select("failed_count, locked_until")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function isLocked(attempt: AttemptRow | null) {
  return Boolean(
    attempt?.locked_until && new Date(attempt.locked_until).getTime() > Date.now(),
  );
}

async function recordFailedAttempt(supabase: SupabaseClient, username: string) {
  const existing = await getAttempt(supabase, username);
  const failedCount = (existing?.failed_count ?? 0) + 1;
  const lockedUntil =
    failedCount >= maxFailedAttempts
      ? new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString()
      : null;

  const { error } = await supabase.from("account_login_attempts").upsert(
    {
      failed_count: failedCount,
      last_failed_at: new Date().toISOString(),
      locked_until: lockedUntil,
      username,
    },
    { onConflict: "username" },
  );

  if (error) {
    throw error;
  }
}

async function clearFailedAttempts(supabase: SupabaseClient, username: string) {
  const { error } = await supabase
    .from("account_login_attempts")
    .delete()
    .eq("username", username);

  if (error) {
    throw error;
  }
}

export async function createAccount(
  supabase: SupabaseClient,
  input: {
    displayName: string;
    pin: string;
    username: string;
  },
) {
  const { data: existing, error: existingError } = await supabase
    .from("accounts")
    .select("id")
    .eq("username", input.username)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return { account: null, error: "username_taken" as const };
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .insert({
      display_name: input.displayName,
      pin_hash: hashPin(input.pin),
      username: input.username,
    })
    .select("id, username, display_name, pin_hash, created_at")
    .single();

  if (accountError) {
    if (accountError.code === "23505") {
      return { account: null, error: "username_taken" as const };
    }

    throw accountError;
  }

  const { data: stats, error: statsError } = await supabase
    .from("account_stats")
    .insert({ account_id: account.id })
    .select(
      "games_played, wins, ties, highest_prize_won, total_money_won, fastest_finger_wins, questions_answered_correctly",
    )
    .single();

  if (statsError) {
    throw statsError;
  }

  const session = await createSession(supabase, account.id);
  return { account: publicAccount(account, stats), error: null, session };
}

export async function loginAccount(
  supabase: SupabaseClient,
  input: { pin: string; username: string },
) {
  const attempt = await getAttempt(supabase, input.username);

  if (isLocked(attempt)) {
    return { account: null, error: "locked" as const };
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, username, display_name, pin_hash, created_at")
    .eq("username", input.username)
    .maybeSingle();

  if (accountError) {
    throw accountError;
  }

  if (!account || !verifyPin(input.pin, account.pin_hash)) {
    await recordFailedAttempt(supabase, input.username);
    return { account: null, error: "invalid_login" as const };
  }

  await clearFailedAttempts(supabase, input.username);

  const { data: stats, error: statsError } = await supabase
    .from("account_stats")
    .select(
      "games_played, wins, ties, highest_prize_won, total_money_won, fastest_finger_wins, questions_answered_correctly",
    )
    .eq("account_id", account.id)
    .maybeSingle();

  if (statsError) {
    throw statsError;
  }

  const session = await createSession(supabase, account.id);
  return { account: publicAccount(account, stats), error: null, session };
}

export async function createSession(supabase: SupabaseClient, accountId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(
    Date.now() + sessionMaxAgeSeconds * 1000,
  ).toISOString();

  const { error } = await supabase.from("account_sessions").insert({
    account_id: accountId,
    expires_at: expiresAt,
    token_hash: hashSessionToken(token),
  });

  if (error) {
    throw error;
  }

  return { expiresAt, token };
}

export async function getAccountBySession(
  supabase: SupabaseClient,
  token: string | undefined,
) {
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const { data: session, error: sessionError } = await supabase
    .from("account_sessions")
    .select("account_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (sessionError) {
    throw sessionError;
  }

  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, username, display_name, pin_hash, created_at")
    .eq("id", session.account_id)
    .maybeSingle();

  if (accountError) {
    throw accountError;
  }

  if (!account) {
    return null;
  }

  const { data: stats, error: statsError } = await supabase
    .from("account_stats")
    .select(
      "games_played, wins, ties, highest_prize_won, total_money_won, fastest_finger_wins, questions_answered_correctly",
    )
    .eq("account_id", account.id)
    .maybeSingle();

  if (statsError) {
    throw statsError;
  }

  return publicAccount(account, stats);
}

export async function deleteSession(
  supabase: SupabaseClient,
  token: string | undefined,
) {
  if (!token) {
    return;
  }

  const { error } = await supabase
    .from("account_sessions")
    .delete()
    .eq("token_hash", hashSessionToken(token));

  if (error) {
    throw error;
  }
}

export async function updateDisplayName(
  supabase: SupabaseClient,
  input: { accountId: string; displayName: string },
) {
  const { data: account, error } = await supabase
    .from("accounts")
    .update({ display_name: input.displayName })
    .eq("id", input.accountId)
    .select("id, username, display_name, pin_hash, created_at")
    .single();

  if (error) {
    throw error;
  }

  const { data: stats, error: statsError } = await supabase
    .from("account_stats")
    .select(
      "games_played, wins, ties, highest_prize_won, total_money_won, fastest_finger_wins, questions_answered_correctly",
    )
    .eq("account_id", account.id)
    .maybeSingle();

  if (statsError) {
    throw statsError;
  }

  return publicAccount(account, stats);
}
