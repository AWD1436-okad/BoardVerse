import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicAccount } from "./auth";

export type RoomStatus =
  | "waiting"
  | "starting"
  | "fastest_finger"
  | "hot_seat"
  | "completed";

export type GameState = {
  completedTurnAccountIds: string[];
  currentRoomStatus: Exclude<RoomStatus, "waiting">;
  currentFastestFingerRoundId: string | null;
  eligibleAccountIds: string[];
  fastestFingerWinnerAccountId: string | null;
  hostAccountId: string;
  hotSeatAccountId: string | null;
  id: string;
  joinOrder: string[];
  roomId: string;
};

export type RoomPlayer = {
  accountId: string;
  displayName: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: string;
  leftAt: string | null;
  leftDuringGame: boolean;
  username: string;
};

export type PublicRoom = {
  activePlayerCount: number;
  code: string;
  createdAt: string;
  hostAccountId: string;
  id: string;
  players: RoomPlayer[];
  selectedPlayerCount: number;
  canStart: boolean;
  gameState: GameState | null;
  status: RoomStatus;
};

type RoomRow = {
  code: string;
  created_at: string;
  host_account_id: string;
  id: string;
  selected_player_count: number;
  status: RoomStatus;
};

type GameStateRow = {
  completed_turn_account_ids: string[];
  current_room_status: Exclude<RoomStatus, "waiting">;
  current_fastest_finger_round_id: string | null;
  eligible_account_ids: string[];
  fastest_finger_winner_account_id: string | null;
  host_account_id: string;
  hot_seat_account_id: string | null;
  id: string;
  join_order: string[];
  room_id: string;
};

type RoomPlayerRow = {
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
  is_ready: boolean;
  joined_at: string;
  left_at: string | null;
  left_during_game: boolean;
};

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function normalizeRoomCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function validateRoomCode(code: string) {
  const normalized = normalizeRoomCode(code);

  if (!/^[A-Z0-9]{6}$/.test(normalized)) {
    return {
      ok: false,
      message: "Room code must be 6 letters or numbers.",
    } as const;
  }

  return { ok: true, normalized } as const;
}

export function validatePlayerCount(value: unknown) {
  const count = Number(value);

  if (!Number.isInteger(count) || count < 2 || count > 10) {
    return {
      ok: false,
      message: "Choose a player count from 2 to 10.",
    } as const;
  }

  return { count, ok: true } as const;
}

function activePlayers(players: RoomPlayer[]) {
  return players.filter((player) => !player.leftAt);
}

function accountForPlayer(player: RoomPlayerRow) {
  return Array.isArray(player.accounts) ? player.accounts[0] : player.accounts;
}

function toPublicGameState(row: GameStateRow | null): GameState | null {
  if (!row) {
    return null;
  }

  return {
    completedTurnAccountIds: row.completed_turn_account_ids,
    currentRoomStatus: row.current_room_status,
    currentFastestFingerRoundId: row.current_fastest_finger_round_id,
    eligibleAccountIds: row.eligible_account_ids,
    fastestFingerWinnerAccountId: row.fastest_finger_winner_account_id,
    hostAccountId: row.host_account_id,
    hotSeatAccountId: row.hot_seat_account_id,
    id: row.id,
    joinOrder: row.join_order,
    roomId: row.room_id,
  };
}

function toPublicRoom(
  room: RoomRow,
  players: RoomPlayerRow[],
  gameState: GameStateRow | null,
): PublicRoom {
  const publicPlayers = players
    .map((player) => {
      const account = accountForPlayer(player);

      return {
        accountId: player.account_id,
        displayName: account?.display_name ?? "Player",
        isHost: player.account_id === room.host_account_id,
        isReady: player.is_ready,
        joinedAt: player.joined_at,
        leftAt: player.left_at,
        leftDuringGame: player.left_during_game,
        username: account?.username ?? "",
      };
    })
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
  const active = activePlayers(publicPlayers);

  return {
    activePlayerCount: active.length,
    canStart:
      room.status === "waiting" &&
      active.length === room.selected_player_count &&
      active.every((player) => player.isReady),
    code: room.code,
    createdAt: room.created_at,
    gameState: toPublicGameState(gameState),
    hostAccountId: room.host_account_id,
    id: room.id,
    players: publicPlayers,
    selectedPlayerCount: room.selected_player_count,
    status: room.status,
  };
}

async function fetchRoomById(supabase: SupabaseClient, roomId: string) {
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, code, host_account_id, selected_player_count, status, created_at")
    .eq("id", roomId)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (!room) {
    return null;
  }

  const { data: players, error: playersError } = await supabase
    .from("room_players")
    .select(
      "account_id, is_ready, joined_at, left_at, left_during_game, accounts(username, display_name)",
    )
    .eq("room_id", room.id)
    .order("joined_at", { ascending: true });

  if (playersError) {
    throw playersError;
  }

  const { data: gameState, error: gameStateError } = await supabase
    .from("game_states")
    .select(
      "id, room_id, current_room_status, current_fastest_finger_round_id, host_account_id, join_order, completed_turn_account_ids, eligible_account_ids, fastest_finger_winner_account_id, hot_seat_account_id",
    )
    .eq("room_id", room.id)
    .maybeSingle();

  if (gameStateError) {
    throw gameStateError;
  }

  return toPublicRoom(
    room,
    (players ?? []) as unknown as RoomPlayerRow[],
    gameState as GameStateRow | null,
  );
}

export async function emitRoomEvent(
  supabase: SupabaseClient,
  input: {
    actorAccountId?: string;
    eventType:
      | "player_joined"
      | "player_left"
      | "ready_changed"
      | "host_changed"
      | "room_status_changed"
      | "game_started"
      | "fastest_finger_round_started"
      | "fastest_finger_submitted"
      | "fastest_finger_winner";
    payload?: Record<string, unknown>;
    roomId: string;
  },
) {
  const { error } = await supabase.from("room_events").insert({
    actor_account_id: input.actorAccountId ?? null,
    event_type: input.eventType,
    payload: input.payload ?? {},
    room_id: input.roomId,
  });

  if (error) {
    throw error;
  }
}

async function createUniqueRoomCode(supabase: SupabaseClient) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return code;
    }
  }

  throw new Error("Could not generate a unique room code.");
}

export async function createRoom(
  supabase: SupabaseClient,
  input: { account: PublicAccount; selectedPlayerCount: number },
) {
  const code = await createUniqueRoomCode(supabase);
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      code,
      host_account_id: input.account.id,
      selected_player_count: input.selectedPlayerCount,
      status: "waiting",
    })
    .select("id, code, host_account_id, selected_player_count, status, created_at")
    .single();

  if (roomError) {
    throw roomError;
  }

  const { error: playerError } = await supabase.from("room_players").insert({
    account_id: input.account.id,
    is_ready: false,
    room_id: room.id,
  });

  if (playerError) {
    throw playerError;
  }

  await emitRoomEvent(supabase, {
    actorAccountId: input.account.id,
    eventType: "player_joined",
    payload: { source: "create_room" },
    roomId: room.id,
  });

  return fetchRoomById(supabase, room.id);
}

export async function getRoom(supabase: SupabaseClient, roomId: string) {
  return fetchRoomById(supabase, roomId);
}

export async function joinRoom(
  supabase: SupabaseClient,
  input: { account: PublicAccount; code: string },
) {
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, code, host_account_id, selected_player_count, status, created_at")
    .eq("code", input.code)
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  if (!room) {
    return { error: "room_not_found" as const, room: null };
  }

  const current = await fetchRoomById(supabase, room.id);

  if (!current) {
    return { error: "room_not_found" as const, room: null };
  }

  const existing = current.players.find(
    (player) => player.accountId === input.account.id,
  );

  if (existing?.leftDuringGame) {
    return { error: "game_already_started" as const, room: null };
  }

  if (current.status !== "waiting") {
    return { error: "game_already_started" as const, room: null };
  }

  if (
    !existing?.leftAt &&
    current.activePlayerCount >= current.selectedPlayerCount
  ) {
    return { error: "room_full" as const, room: null };
  }

  if (existing) {
    const { error } = await supabase
      .from("room_players")
      .update({
        is_ready: false,
        left_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("room_id", room.id)
      .eq("account_id", input.account.id);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabase.from("room_players").insert({
      account_id: input.account.id,
      is_ready: false,
      room_id: room.id,
    });

    if (error) {
      throw error;
    }
  }

  await emitRoomEvent(supabase, {
    actorAccountId: input.account.id,
    eventType: "player_joined",
    payload: { rejoined: Boolean(existing) },
    roomId: room.id,
  });

  return { error: null, room: await fetchRoomById(supabase, room.id) };
}

export async function setReady(
  supabase: SupabaseClient,
  input: { accountId: string; isReady: boolean; roomId: string },
) {
  const room = await fetchRoomById(supabase, input.roomId);

  if (!room) {
    return { error: "room_not_found" as const, room: null };
  }

  if (room.status !== "waiting") {
    return { error: "game_already_started" as const, room: null };
  }

  const player = room.players.find(
    (item) => item.accountId === input.accountId && !item.leftAt,
  );

  if (!player) {
    return { error: "not_in_room" as const, room: null };
  }

  const { error } = await supabase
    .from("room_players")
    .update({
      is_ready: input.isReady,
      updated_at: new Date().toISOString(),
    })
    .eq("room_id", input.roomId)
    .eq("account_id", input.accountId);

  if (error) {
    throw error;
  }

  await emitRoomEvent(supabase, {
    actorAccountId: input.accountId,
    eventType: "ready_changed",
    payload: { isReady: input.isReady },
    roomId: input.roomId,
  });

  return { error: null, room: await fetchRoomById(supabase, input.roomId) };
}

async function transferHostIfNeeded(
  supabase: SupabaseClient,
  room: PublicRoom,
  leavingAccountId: string,
) {
  if (room.hostAccountId !== leavingAccountId) {
    return;
  }

  const nextHost = activePlayers(room.players)
    .filter((player) => player.accountId !== leavingAccountId)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))[0];

  if (!nextHost) {
    return;
  }

  const { error } = await supabase
    .from("rooms")
    .update({
      host_account_id: nextHost.accountId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id);

  if (error) {
    throw error;
  }

  await emitRoomEvent(supabase, {
    actorAccountId: leavingAccountId,
    eventType: "host_changed",
    payload: { hostAccountId: nextHost.accountId },
    roomId: room.id,
  });
}

export async function leaveRoom(
  supabase: SupabaseClient,
  input: { accountId: string; roomId: string },
) {
  const room = await fetchRoomById(supabase, input.roomId);

  if (!room) {
    return { error: "room_not_found" as const, room: null };
  }

  const player = room.players.find(
    (item) => item.accountId === input.accountId && !item.leftAt,
  );

  if (!player) {
    return { error: "not_in_room" as const, room: null };
  }

  const { error } = await supabase
    .from("room_players")
    .update({
      is_ready: false,
      left_at: new Date().toISOString(),
      left_during_game: room.status !== "waiting",
      updated_at: new Date().toISOString(),
    })
    .eq("room_id", input.roomId)
    .eq("account_id", input.accountId);

  if (error) {
    throw error;
  }

  await transferHostIfNeeded(supabase, room, input.accountId);
  await emitRoomEvent(supabase, {
    actorAccountId: input.accountId,
    eventType: "player_left",
    payload: { leftDuringGame: room.status !== "waiting" },
    roomId: input.roomId,
  });
  return { error: null, room: await fetchRoomById(supabase, input.roomId) };
}

export async function startRoom(
  supabase: SupabaseClient,
  input: { accountId: string; roomId: string },
) {
  const room = await fetchRoomById(supabase, input.roomId);

  if (!room) {
    return { error: "room_not_found" as const, room: null };
  }

  if (room.hostAccountId !== input.accountId) {
    return { error: "host_only" as const, room };
  }

  if (room.status !== "waiting") {
    return { error: "game_already_started" as const, room };
  }

  if (room.activePlayerCount !== room.selectedPlayerCount) {
    return { error: "room_not_full" as const, room };
  }

  if (!activePlayers(room.players).every((player) => player.isReady)) {
    return { error: "not_all_ready" as const, room };
  }

  const now = new Date().toISOString();
  const active = activePlayers(room.players);
  const joinOrder = active.map((player) => player.accountId);
  const { error: startingError } = await supabase
    .from("rooms")
    .update({
      membership_locked_at: now,
      started_at: now,
      status: "starting",
      updated_at: now,
    })
    .eq("id", input.roomId);

  if (startingError) {
    throw startingError;
  }

  await emitRoomEvent(supabase, {
    actorAccountId: input.accountId,
    eventType: "room_status_changed",
    payload: { status: "starting" },
    roomId: input.roomId,
  });

  const { error: gameStateError } = await supabase.from("game_states").upsert(
    {
      completed_turn_account_ids: [],
      current_fastest_finger_round_id: null,
      current_room_status: "starting",
      eligible_account_ids: joinOrder,
      fastest_finger_winner_account_id: null,
      host_account_id: room.hostAccountId,
      hot_seat_account_id: null,
      join_order: joinOrder,
      room_id: input.roomId,
      updated_at: now,
    },
    { onConflict: "room_id" },
  );

  if (gameStateError) {
    throw gameStateError;
  }

  const fastestFingerAt = new Date().toISOString();
  const { error: fastestFingerRoomError } = await supabase
    .from("rooms")
    .update({
      status: "fastest_finger",
      updated_at: fastestFingerAt,
    })
    .eq("id", input.roomId);

  if (fastestFingerRoomError) {
    throw fastestFingerRoomError;
  }

  const { error: fastestFingerGameStateError } = await supabase
    .from("game_states")
    .update({
      current_room_status: "fastest_finger",
      updated_at: fastestFingerAt,
    })
    .eq("room_id", input.roomId);

  if (fastestFingerGameStateError) {
    throw fastestFingerGameStateError;
  }

  await emitRoomEvent(supabase, {
    actorAccountId: input.accountId,
    eventType: "room_status_changed",
    payload: { status: "fastest_finger" },
    roomId: input.roomId,
  });
  await emitRoomEvent(supabase, {
    actorAccountId: input.accountId,
    eventType: "game_started",
    payload: { eligibleAccountIds: joinOrder },
    roomId: input.roomId,
  });

  return { error: null, room: await fetchRoomById(supabase, input.roomId) };
}
