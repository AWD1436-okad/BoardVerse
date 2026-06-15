"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/final-answer/supabase-browser";

type Panel = "signup" | "login" | "create-room" | "join-room";
type RoomStatus =
  | "waiting"
  | "starting"
  | "fastest_finger"
  | "hot_seat"
  | "completed";
type ReportReason = "wrong_answer" | "ambiguous_wording" | "typo" | "other";

type AccountStats = {
  fastestFingerWins: number;
  gamesPlayed: number;
  highestPrizeWon: number;
  questionsAnsweredCorrectly: number;
  ties: number;
  totalMoneyWon: number;
  wins: number;
};

type Account = {
  createdAt: string;
  displayName: string;
  id: string;
  isAdmin: boolean;
  stats: AccountStats;
  username: string;
};

type RoomPlayer = {
  accountId: string;
  displayName: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: string;
  leftAt: string | null;
  leftDuringGame: boolean;
  username: string;
};

type Room = {
  activePlayerCount: number;
  canStart: boolean;
  code: string;
  createdAt: string;
  gameState: GameState | null;
  hostAccountId: string;
  id: string;
  players: RoomPlayer[];
  selectedPlayerCount: number;
  status: RoomStatus;
};

type GameState = {
  completedTurnAccountIds: string[];
  currentRoomStatus: Exclude<RoomStatus, "waiting">;
  currentFastestFingerRoundId: string | null;
  currentHotSeatTurnId: string | null;
  eligibleAccountIds: string[];
  fastestFingerWinnerAccountId: string | null;
  hostAccountId: string;
  hotSeatAccountId: string | null;
  id: string;
  joinOrder: string[];
  roomId: string;
};

type Question = {
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

type FastestFingerItemKey = "item_1" | "item_2" | "item_3" | "item_4";
type HotSeatAnswerKey = "A" | "B" | "C" | "D";

type FastestFingerState = {
  endsAt: string;
  eligiblePlayerCount: number;
  items: Array<{ key: FastestFingerItemKey; text: string }>;
  loadedAt: number;
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

type HotSeatState = {
  audiencePercentages: Record<HotSeatAnswerKey, number> | null;
  correctAnswer: HotSeatAnswerKey | null;
  currentLevel: number;
  currentPrize: number;
  finalAnswer: HotSeatAnswerKey | null;
  finalWinnings: number | null;
  hotSeatPlayer: {
    accountId: string;
    displayName: string;
  };
  isCorrect: boolean | null;
  ladder: Array<{
    amount: number;
    isCurrent: boolean;
    isSafetyNet: boolean;
    level: number;
  }>;
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
  removedAnswers: HotSeatAnswerKey[];
  selectedAnswer: HotSeatAnswerKey | null;
  status:
    | "awaiting_answer"
    | "revealed_correct"
    | "revealed_wrong"
    | "turn_complete";
  turnId: string;
  used5050: boolean;
  usedAudience: boolean;
  usedPass: boolean;
};

type ReportedQuestion = Question & {
  active: boolean;
  correctAnswer: string;
  createdAt: string;
  reportCount: number;
};

type ApiResponse = {
  account?: Account | null;
  code?: string;
  configured?: boolean;
  message?: string;
  missing?: string[];
  ok: boolean;
  fastestFinger?: Omit<FastestFingerState, "loadedAt"> | null;
  hotSeat?: HotSeatState | null;
  prizeAmount?: number;
  question?: Question | null;
  questions?: ReportedQuestion[];
  reportCount?: number;
  room?: Room | null;
};

const ladder = [
  "$1,000,000",
  "$500,000",
  "$250,000",
  "$125,000",
  "$64,000",
  "$32,000",
  "$16,000",
  "$8,000",
  "$4,000",
  "$1,000",
  "$500",
  "$100",
];

const featurePanels = [
  {
    title: "Private Rooms",
    text: "2-10 players, room-code entry, ready checks, and automatic host transfer.",
  },
  {
    title: "Fastest Finger",
    text: "A 30-second ordering challenge decides who takes the hot seat each round.",
  },
  {
    title: "Three Lifelines",
    text: "50:50, Ask The Audience, and Pass create strategy without copying protected assets.",
  },
];

const emptyStats: AccountStats = {
  fastestFingerWins: 0,
  gamesPlayed: 0,
  highestPrizeWon: 0,
  questionsAnsweredCorrectly: 0,
  ties: 0,
  totalMoneyWon: 0,
  wins: 0,
};

const statLabels: Array<[keyof AccountStats, string]> = [
  ["gamesPlayed", "Games played"],
  ["wins", "Wins"],
  ["ties", "Ties"],
  ["highestPrizeWon", "Highest prize"],
  ["totalMoneyWon", "Total prize score"],
  ["fastestFingerWins", "Fastest Finger wins"],
  ["questionsAnsweredCorrectly", "Correct answers"],
];

const reportReasons: Array<[ReportReason, string]> = [
  ["wrong_answer", "Wrong answer"],
  ["ambiguous_wording", "Ambiguous wording"],
  ["typo", "Typo"],
  ["other", "Other"],
];

function formatStat(key: keyof AccountStats, value: number) {
  if (key === "highestPrizeWon" || key === "totalMoneyWon") {
    return `$${value.toLocaleString()}`;
  }

  return value.toLocaleString();
}

function formatPrize(value: number) {
  return `$${value.toLocaleString()}`;
}

function validPin(pin: string) {
  return /^\d{4}$/.test(pin);
}

function isValidRoomCode(code: string) {
  return /^[A-Z0-9]{6}$/.test(code.trim().toUpperCase());
}

export function FinalAnswerApp() {
  const [activePanel, setActivePanel] = useState<Panel>("signup");
  const [account, setAccount] = useState<Account | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [missingSetup, setMissingSetup] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("Realtime idle");
  const [busy, setBusy] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [fastestFinger, setFastestFinger] = useState<FastestFingerState | null>(
    null,
  );
  const [fastestFingerOrder, setFastestFingerOrder] = useState<
    FastestFingerItemKey[]
  >(["item_1", "item_2", "item_3", "item_4"]);
  const [hotSeat, setHotSeat] = useState<HotSeatState | null>(null);
  const [selectedHotSeatAnswer, setSelectedHotSeatAnswer] =
    useState<HotSeatAnswerKey | null>(null);
  const [confirmingHotSeatAnswer, setConfirmingHotSeatAnswer] = useState(false);
  const [confirmingPass, setConfirmingPass] = useState(false);
  const [hotSeatRevealPending, setHotSeatRevealPending] = useState(false);
  const [timerNow, setTimerTick] = useState(Date.now());
  const [question, setQuestion] = useState<Question | null>(null);
  const [reportedQuestions, setReportedQuestions] = useState<ReportedQuestion[]>(
    [],
  );

  const [signupUsername, setSignupUsername] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [signupPin, setSignupPin] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [roomPlayerCount, setRoomPlayerCount] = useState(2);
  const [joinCode, setJoinCode] = useState("");
  const [questionLevel, setQuestionLevel] = useState(1);
  const [reportReason, setReportReason] =
    useState<ReportReason>("wrong_answer");

  const stats = account?.stats ?? emptyStats;
  const joinedDate = account?.createdAt
    ? new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(account.createdAt))
    : "";
  const currentPlayer = room?.players.find(
    (player) => player.accountId === account?.id && !player.leftAt,
  );
  const isHost = Boolean(room && account?.id === room.hostAccountId);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const response = await fetch("/api/account/session");
      const data = (await response.json()) as ApiResponse;

      if (cancelled) {
        return;
      }

      setConfigured(Boolean(data.configured));
      setMissingSetup(data.missing ?? []);

      if (data.account) {
        setAccount(data.account);
        setDisplayNameDraft(data.account.displayName);
        setMessage(`Welcome back, ${data.account.displayName}.`);
      }
    }

    loadSession().catch(() => {
      if (!cancelled) {
        setMessage("Could not check account session. Try refreshing the page.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!room?.id || !account) {
      return;
    }

    const timer = window.setInterval(() => {
      refreshRoom(false);
    }, 30000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, account?.id]);

  useEffect(() => {
    if (!room?.id || !account) {
      return;
    }

    if (room.status === "fastest_finger") {
      loadFastestFingerState(false);
      return;
    }

    if (room.status === "hot_seat") {
      loadHotSeatState(false);
      return;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.status, account?.id]);

  useEffect(() => {
    if (!fastestFinger || fastestFinger.status !== "active") {
      return;
    }

    const timer = window.setInterval(() => {
      setTimerTick(Date.now());
    }, 250);

    return () => window.clearInterval(timer);
  }, [fastestFinger]);

  useEffect(() => {
    if (!room?.id || !account) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    let refreshQueued = false;
    const channel = supabase
      .channel(`room-events:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `room_id=eq.${room.id}`,
          schema: "public",
          table: "room_events",
        },
        () => {
          if (refreshQueued) {
            return;
          }

          refreshQueued = true;
          window.setTimeout(() => {
            refreshQueued = false;
            refreshRoom(false);
            if (room.status === "fastest_finger") {
              loadFastestFingerState(false);
            } else if (room.status === "hot_seat") {
              loadHotSeatState(false);
            }
          }, 150);
        },
      )
      .subscribe((status) => {
        setRealtimeStatus(`Realtime ${status.toLowerCase()}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, account?.id]);

  function showApiError(data: ApiResponse, fallback: string) {
    if (data.code === "setup_required") {
      setConfigured(false);
      setMissingSetup(data.missing ?? []);
    }

    setMessage(data.message || fallback);
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validPin(signupPin)) {
      setMessage("PIN must be exactly 4 digits.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/account/signup", {
        body: JSON.stringify({
          displayName: signupDisplayName,
          pin: signupPin,
          username: signupUsername,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.account) {
        showApiError(data, "Could not create account.");
        return;
      }

      setConfigured(true);
      setAccount(data.account);
      setDisplayNameDraft(data.account.displayName);
      setSignupPin("");
      setMessage(`Account created. Welcome, ${data.account.displayName}.`);
    } catch {
      setMessage("Could not create account. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validPin(loginPin)) {
      setMessage("PIN must be exactly 4 digits.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/account/login", {
        body: JSON.stringify({
          pin: loginPin,
          username: loginUsername,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.account) {
        showApiError(data, "Wrong username or PIN.");
        return;
      }

      setConfigured(true);
      setAccount(data.account);
      setDisplayNameDraft(data.account.displayName);
      setLoginPin("");
      setMessage(`Logged in as ${data.account.displayName}.`);
    } catch {
      setMessage("Could not log in. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/account/profile", {
        body: JSON.stringify({ displayName: displayNameDraft }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.account) {
        showApiError(data, "Could not update display name.");
        return;
      }

      setAccount(data.account);
      setDisplayNameDraft(data.account.displayName);
      setMessage("Display name updated.");
    } catch {
      setMessage("Could not update display name. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setMessage("");

    try {
      await fetch("/api/account/logout", { method: "POST" });
      setAccount(null);
      setRoom(null);
      setFastestFinger(null);
      setHotSeat(null);
      setDisplayNameDraft("");
      setLoginPin("");
      setSignupPin("");
      setMessage("Logged out.");
    } catch {
      setMessage("Could not log out. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!account) {
      setMessage("You must be logged in to create a room.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/rooms/create", {
        body: JSON.stringify({ playerCount: roomPlayerCount }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.room) {
        showApiError(data, "Could not create room.");
        return;
      }

      setRoom(data.room);
      setMessage(`Room created. Share code ${data.room.code}.`);
    } catch {
      setMessage("Could not create room. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!account) {
      setMessage("You must be logged in to join a room.");
      return;
    }

    if (!isValidRoomCode(joinCode)) {
      setMessage("Room code must be 6 letters or numbers.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/rooms/join", {
        body: JSON.stringify({ code: joinCode }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.room) {
        showApiError(data, "Could not join room.");
        return;
      }

      setRoom(data.room);
      setJoinCode(data.room.code);
      setMessage(`Joined room ${data.room.code}.`);
    } catch {
      setMessage("Could not join room. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshRoom(showMessage = true) {
    if (!room?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${room.id}`);
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.room) {
        if (showMessage) {
          showApiError(data, "Could not refresh room.");
        }
        return;
      }

      setRoom(data.room);
      if (showMessage) {
        setMessage("Room refreshed.");
      }
    } catch {
      if (showMessage) {
        setMessage("Could not refresh room. Try again.");
      }
    }
  }

  async function updateReady(isReady: boolean) {
    if (!room?.id) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/rooms/${room.id}/ready`, {
        body: JSON.stringify({ isReady }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.room) {
        showApiError(data, "Could not update ready status.");
        return;
      }

      setRoom(data.room);
      setMessage(isReady ? "You are ready." : "You are not ready.");
    } catch {
      setMessage("Could not update ready status. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function leaveRoom() {
    if (!room?.id) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/rooms/${room.id}/leave`, {
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        showApiError(data, "Could not leave room.");
        return;
      }

      setRoom(null);
      setFastestFinger(null);
      setHotSeat(null);
      setMessage(
        room.status !== "waiting"
          ? "You left after the game started, so you cannot rejoin that game."
          : "You left the room. You can rejoin by code before it starts.",
      );
    } catch {
      setMessage("Could not leave room. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function startRoom() {
    if (!room?.id) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/rooms/${room.id}/start`, {
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.room) {
        showApiError(data, "Could not start room.");
        if (data.room) {
          setRoom(data.room);
        }
        return;
      }

      setRoom(data.room);
      setMessage("Fastest Finger started.");
    } catch {
      setMessage("Could not start room. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function setLoadedFastestFinger(
    state: Omit<FastestFingerState, "loadedAt"> | null | undefined,
  ) {
    if (!state) {
      setFastestFinger(null);
      return;
    }

    setFastestFinger({ ...state, loadedAt: Date.now() });
    setFastestFingerOrder(state.submission?.submittedOrder ?? state.items.map((item) => item.key));
    setTimerTick(Date.now());
  }

  async function loadFastestFingerState(showMessage = false) {
    if (!room?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${room.id}/fastest-finger`);
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.fastestFinger) {
        if (showMessage) {
          showApiError(data, "Could not load Fastest Finger.");
        }
        return;
      }

      setLoadedFastestFinger(data.fastestFinger);

      if (showMessage) {
        setMessage("Fastest Finger refreshed.");
      }
    } catch {
      if (showMessage) {
        setMessage("Could not load Fastest Finger. Try again.");
      }
    }
  }

  async function submitFastestFingerOrder(order: FastestFingerItemKey[]) {
    if (!room?.id) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/rooms/${room.id}/fastest-finger`, {
        body: JSON.stringify({ order }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;

      if (data.fastestFinger) {
        setLoadedFastestFinger(data.fastestFinger);
      }

      if (!response.ok || !data.fastestFinger) {
        showApiError(data, "Could not submit Fastest Finger.");
        return;
      }

      setMessage(
        data.fastestFinger.winner
          ? `Winner: ${data.fastestFinger.winner.displayName}.`
          : "Waiting for other players...",
      );
    } catch {
      setMessage("Could not submit Fastest Finger. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function setLoadedHotSeat(state: HotSeatState | null | undefined) {
    if (!state) {
      setHotSeat(null);
      setSelectedHotSeatAnswer(null);
      setConfirmingHotSeatAnswer(false);
      setConfirmingPass(false);
      return;
    }

    setHotSeat(state);
    setSelectedHotSeatAnswer(state.selectedAnswer ?? state.finalAnswer);
    setConfirmingHotSeatAnswer(false);
    setConfirmingPass(false);
  }

  async function loadHotSeatState(showMessage = false) {
    if (!room?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${room.id}/hot-seat`);
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.hotSeat) {
        if (showMessage) {
          showApiError(data, "Could not load Hot Seat.");
        }
        return;
      }

      setLoadedHotSeat(data.hotSeat);

      if (showMessage) {
        setMessage("Hot Seat refreshed.");
      }
    } catch {
      if (showMessage) {
        setMessage("Could not load Hot Seat. Try again.");
      }
    }
  }

  async function submitHotSeatAnswer(answer: HotSeatAnswerKey) {
    if (!room?.id) {
      return;
    }

    setBusy(true);
    setHotSeatRevealPending(true);
    setConfirmingHotSeatAnswer(false);
    setMessage("Final answer locked...");
    const startedAt = Date.now();

    try {
      const response = await fetch(`/api/rooms/${room.id}/hot-seat`, {
        body: JSON.stringify({ action: "answer", answer }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;
      const remainingDelay = Math.max(0, 2400 - (Date.now() - startedAt));

      await new Promise((resolve) => window.setTimeout(resolve, remainingDelay));

      if (data.hotSeat) {
        setLoadedHotSeat(data.hotSeat);
      }

      if (!response.ok || !data.hotSeat) {
        showApiError(data, "Could not lock final answer.");
        return;
      }

      setMessage(
        data.hotSeat.isCorrect
          ? "Correct answer."
          : `Turn finished with $${(data.hotSeat.finalWinnings ?? 0).toLocaleString()}.`,
      );
    } catch {
      setMessage("Could not lock final answer. Try again.");
    } finally {
      setHotSeatRevealPending(false);
      setBusy(false);
    }
  }

  async function continueHotSeat() {
    if (!room?.id) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/rooms/${room.id}/hot-seat`, {
        body: JSON.stringify({ action: "continue" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;

      if (data.room) {
        setRoom(data.room);
      }

      if (data.hotSeat) {
        setLoadedHotSeat(data.hotSeat);
      } else {
        setHotSeat(null);
        setSelectedHotSeatAnswer(null);
      }

      if (!response.ok) {
        showApiError(data, "Could not continue Hot Seat.");
        return;
      }

      if (data.room?.status === "fastest_finger") {
        setFastestFinger(null);
        setMessage("Turn complete. Next Fastest Finger round is ready.");
      } else if (data.room?.status === "completed") {
        setMessage("Game complete.");
      } else if (data.hotSeat) {
        setMessage(`Level ${data.hotSeat.currentLevel} question loaded.`);
      }
    } catch {
      setMessage("Could not continue Hot Seat. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function applyHotSeatLifeline(lifeline: "5050" | "audience" | "pass") {
    if (!room?.id) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/rooms/${room.id}/hot-seat`, {
        body: JSON.stringify({ action: "lifeline", lifeline }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;

      if (data.room) {
        setRoom(data.room);
      }

      if (data.hotSeat) {
        setLoadedHotSeat(data.hotSeat);
      }

      if (!response.ok || !data.hotSeat) {
        showApiError(data, "Could not use lifeline.");
        return;
      }

      if (lifeline === "5050") {
        setMessage("50:50 removed two wrong answers.");
      } else if (lifeline === "audience") {
        setMessage("Audience result is in.");
      } else {
        setFastestFinger(null);
        setMessage(`${data.hotSeat.hotSeatPlayer.displayName} is now in the Hot Seat.`);
      }
    } catch {
      setMessage("Could not use lifeline. Try again.");
    } finally {
      setConfirmingPass(false);
      setBusy(false);
    }
  }

  async function loadQuestion() {
    if (!account) {
      setMessage("You must be logged in to load a question.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/questions/random?level=${questionLevel}`);
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.question) {
        showApiError(data, "Could not load a question.");
        return;
      }

      setQuestion(data.question);
      setMessage(`Loaded level ${data.question.level} question.`);
    } catch {
      setMessage("Could not load a question. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitQuestionReport() {
    if (!question) {
      setMessage("Load a question before reporting.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/questions/${question.id}/report`, {
        body: JSON.stringify({ reason: reportReason }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        showApiError(data, "Could not report question.");
        return;
      }

      setMessage(`Question report saved. Report count: ${data.reportCount ?? 1}.`);
      if (account?.isAdmin) {
        loadAdminReports();
      }
    } catch {
      setMessage("Could not report question. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function loadAdminReports() {
    if (!account?.isAdmin) {
      setMessage("Only admins can view reported questions.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/questions/reports");
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        showApiError(data, "Could not load reported questions.");
        return;
      }

      setReportedQuestions(data.questions ?? []);
      setMessage(`Loaded ${data.questions?.length ?? 0} reported questions.`);
    } catch {
      setMessage("Could not load reported questions. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#030711] text-white">
      <section className="relative isolate min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_16%,rgba(39,93,184,0.42),transparent_31%),radial-gradient(circle_at_74%_12%,rgba(214,161,50,0.18),transparent_26%),linear-gradient(135deg,#02040b_0%,#08142b_47%,#030711_100%)]" />
        <div className="absolute left-1/2 top-0 -z-10 h-[620px] w-[620px] -translate-x-1/2 rounded-full border border-[#d5ad57]/20 bg-[#153a7a]/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[#f5cc73] to-transparent" />

        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a
            aria-label="Final Answer home"
            className="group flex items-center gap-3"
            href="#top"
          >
            <span className="grid h-12 w-12 place-items-center border border-[#f6d37a]/70 bg-[#071d45] shadow-[0_0_28px_rgba(246,211,122,0.24)]">
              <span className="text-lg font-black tracking-tight text-[#f6d37a]">
                FA
              </span>
            </span>
            <span>
              <span className="block text-lg font-black tracking-[0.18em] text-[#f7d67f]">
                FINAL ANSWER
              </span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.22em] text-blue-100/70">
                Private quiz rooms
              </span>
            </span>
          </a>

          {account ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-right text-sm font-bold text-blue-100 sm:block">
                {account.displayName}
              </span>
              <button
                className="border border-[#f6d37a]/45 bg-[#0d2450]/80 px-4 py-3 text-sm font-black text-[#f6d37a] transition hover:border-[#f6d37a] hover:bg-[#12316a]"
                disabled={busy}
                onClick={logout}
                type="button"
              >
                Log Out
              </button>
            </div>
          ) : (
            <a
              className="hidden border border-[#f6d37a]/45 bg-[#0d2450]/80 px-4 py-3 text-sm font-black text-[#f6d37a] shadow-[0_0_22px_rgba(34,76,151,0.35)] transition hover:border-[#f6d37a] hover:bg-[#12316a] sm:inline-flex"
              href="#account-panel"
            >
              Account
            </a>
          )}
        </header>

        <div
          className="mx-auto grid max-w-7xl items-center gap-8 pb-10 pt-10 lg:min-h-[calc(100vh-92px)] lg:grid-cols-[1.02fr_0.98fr] lg:pt-0"
          id="top"
        >
          <section className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-[#f6d37a]">
              Original private quiz game
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[0.91] tracking-normal text-white sm:text-7xl lg:text-8xl">
              Final Answer
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100/86 sm:text-xl">
              A polished browser quiz night for friends and family, with private
              rooms, a fastest-finger challenge, lifelines, safety nets, and a
              dramatic million-dollar ladder.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                ["signup", "Create Account", "Real account"],
                ["login", "Log In", "PIN login"],
                ["create-room", "Create Room", "Private room"],
                ["join-room", "Join Room", "Room code"],
              ].map(([panel, label, eyebrow]) => (
                <button
                  className={`group border px-5 py-4 text-left transition ${
                    activePanel === panel
                      ? "border-[#f6d37a] bg-[#f6d37a] text-[#081226] shadow-[0_0_32px_rgba(246,211,122,0.25)]"
                      : "border-[#244b91] bg-[#071a3d]/82 text-white hover:border-[#f6d37a]/80 hover:bg-[#0d2c66]"
                  }`}
                  key={panel}
                  onClick={() => {
                    setActivePanel(panel as Panel);
                    setMessage("");
                  }}
                  type="button"
                >
                  <span className="block text-[11px] font-black uppercase tracking-[0.2em] opacity-75">
                    {eyebrow}
                  </span>
                  <span className="mt-1 block text-xl font-black">{label}</span>
                </button>
              ))}
            </div>

            {message && (
              <div className="mt-4 border border-[#f6d37a]/35 bg-[#061733]/92 p-4 text-sm font-bold leading-6 text-blue-100">
                {message}
              </div>
            )}

            {configured === false && (
              <div className="mt-4 border border-[#ff5e5e]/45 bg-[#320f18]/85 p-4 text-sm leading-6 text-red-50">
                <p className="font-black text-white">
                  Supabase setup required before accounts can save.
                </p>
                <p className="mt-2">
                  Missing:{" "}
                  <span className="font-mono text-[#f6d37a]">
                    {missingSetup.join(", ") || "Supabase environment variables"}
                  </span>
                </p>
              </div>
            )}
          </section>

          <section
            aria-label="Account and room panel"
            className="relative border border-[#244b91] bg-[#040b19]/90 p-4 shadow-[14px_14px_0_rgba(214,161,50,0.18),0_0_60px_rgba(21,58,122,0.3)] sm:p-5"
            id="account-panel"
          >
            <div className="absolute -inset-px -z-10 bg-gradient-to-br from-[#f6d37a]/40 via-transparent to-[#2457b7]/50 blur-xl" />
            {room ? (
              <RoomLobby
                account={account}
                busy={busy}
                confirmingPass={confirmingPass}
                currentPlayer={currentPlayer}
                fastestFinger={fastestFinger}
                fastestFingerOrder={fastestFingerOrder}
                confirmingHotSeatAnswer={confirmingHotSeatAnswer}
                hotSeat={hotSeat}
                hotSeatRevealPending={hotSeatRevealPending}
                isHost={isHost}
                onCancelHotSeatAnswer={() => {
                  setConfirmingHotSeatAnswer(false);
                  setSelectedHotSeatAnswer(null);
                }}
                onConfirmHotSeatAnswer={() => {
                  if (selectedHotSeatAnswer) {
                    submitHotSeatAnswer(selectedHotSeatAnswer);
                  }
                }}
                onConfirmPass={() => applyHotSeatLifeline("pass")}
                onContinueHotSeat={continueHotSeat}
                onLeaveRoom={leaveRoom}
                onRefreshHotSeat={() => loadHotSeatState(true)}
                onRefreshFastestFinger={() => loadFastestFingerState(true)}
                onRefreshRoom={() => refreshRoom(true)}
                onSelectHotSeatAnswer={(answer) => {
                  setSelectedHotSeatAnswer(answer);
                  setConfirmingHotSeatAnswer(true);
                }}
                onTogglePassConfirm={(value) => setConfirmingPass(value)}
                onUseLifeline={(lifeline) => applyHotSeatLifeline(lifeline)}
                onStartRoom={startRoom}
                onSubmitFastestFinger={submitFastestFingerOrder}
                onUpdateFastestFingerOrder={setFastestFingerOrder}
                onUpdateReady={updateReady}
                realtimeStatus={room ? realtimeStatus : "Realtime idle"}
                room={room}
                selectedHotSeatAnswer={selectedHotSeatAnswer}
                timerNow={timerNow}
              />
            ) : activePanel === "create-room" || activePanel === "join-room" ? (
              <RoomActionPanel
                account={account}
                activePanel={activePanel}
                busy={busy}
                joinCode={joinCode}
                onCreateRoom={createRoom}
                onJoinCodeChange={setJoinCode}
                onJoinRoom={joinRoom}
                onPlayerCountChange={setRoomPlayerCount}
                playerCount={roomPlayerCount}
              />
            ) : account ? (
              <div className="grid gap-4">
                <ProfilePanel
                  account={account}
                  busy={busy}
                  displayNameDraft={displayNameDraft}
                  joinedDate={joinedDate}
                  onDisplayNameChange={setDisplayNameDraft}
                  onSubmitDisplayName={submitDisplayName}
                  stats={stats}
                />
                <QuestionFoundationPanel
                  account={account}
                  busy={busy}
                  onLoadAdminReports={loadAdminReports}
                  onLoadQuestion={loadQuestion}
                  onQuestionLevelChange={setQuestionLevel}
                  onReportReasonChange={setReportReason}
                  onSubmitQuestionReport={submitQuestionReport}
                  question={question}
                  questionLevel={questionLevel}
                  reportReason={reportReason}
                  reportedQuestions={reportedQuestions}
                />
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1fr_154px]">
                <div className="grid gap-4">
                  <AccountPanel
                    activePanel={activePanel}
                    busy={busy}
                    loginPin={loginPin}
                    loginUsername={loginUsername}
                    onLoginPinChange={setLoginPin}
                    onLoginUsernameChange={setLoginUsername}
                    onSignupDisplayNameChange={setSignupDisplayName}
                    onSignupPinChange={setSignupPin}
                    onSignupUsernameChange={setSignupUsername}
                    signupDisplayName={signupDisplayName}
                    signupPin={signupPin}
                    signupUsername={signupUsername}
                    submitLogin={submitLogin}
                    submitSignup={submitSignup}
                  />
                  <FastestFingerPreview />
                </div>
                <LadderPanel />
              </div>
            )}
          </section>
        </div>
      </section>

      <section
        className="border-y border-[#244b91]/70 bg-[#050c1a] px-4 py-10 sm:px-6 lg:px-8"
        id="milestone-preview"
      >
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {featurePanels.map((panel) => (
            <article
              className="border border-[#244b91] bg-[#071a3d] p-5 shadow-[0_0_30px_rgba(3,8,17,0.25)]"
              key={panel.title}
            >
              <h2 className="text-xl font-black text-[#f6d37a]">
                {panel.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-blue-100/78">
                {panel.text}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function RoomActionPanel(props: {
  account: Account | null;
  activePanel: Panel;
  busy: boolean;
  joinCode: string;
  onCreateRoom: (event: FormEvent<HTMLFormElement>) => void;
  onJoinCodeChange: (value: string) => void;
  onJoinRoom: (event: FormEvent<HTMLFormElement>) => void;
  onPlayerCountChange: (value: number) => void;
  playerCount: number;
}) {
  if (!props.account) {
    return (
      <div className="border border-[#ff5e5e]/45 bg-[#320f18]/85 p-4">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
          Login required
        </p>
        <h2 className="mt-3 text-2xl font-black">Rooms need an account</h2>
        <p className="mt-3 text-sm leading-6 text-red-50">
          You must be logged in to create or join a private room.
        </p>
      </div>
    );
  }

  if (props.activePanel === "join-room") {
    return (
      <form
        className="border border-[#244b91] bg-[#061a3e] p-4"
        onSubmit={props.onJoinRoom}
      >
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
          Private room
        </p>
        <h2 className="mt-3 text-2xl font-black">Join Room</h2>
        <label className="mt-4 block text-sm font-bold text-blue-50">
          Room code
          <input
            className="mt-2 w-full border border-[#244b91] bg-[#020712] px-3 py-3 font-mono text-lg uppercase tracking-[0.18em] text-white outline-none transition placeholder:text-blue-100/32 focus:border-[#f6d37a]"
            maxLength={6}
            onChange={(event) =>
              props.onJoinCodeChange(event.target.value.toUpperCase())
            }
            placeholder="ABC123"
            value={props.joinCode}
          />
        </label>
        <button
          className="mt-4 w-full border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={props.busy}
          type="submit"
        >
          Join Room
        </button>
      </form>
    );
  }

  return (
    <form
      className="border border-[#244b91] bg-[#061a3e] p-4"
      onSubmit={props.onCreateRoom}
    >
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
        Host controls
      </p>
      <h2 className="mt-3 text-2xl font-black">Create Room</h2>
      <label className="mt-4 block text-sm font-bold text-blue-50">
        Player count
        <select
          className="mt-2 w-full border border-[#244b91] bg-[#020712] px-3 py-3 text-white outline-none transition focus:border-[#f6d37a]"
          onChange={(event) =>
            props.onPlayerCountChange(Number(event.target.value))
          }
          value={props.playerCount}
        >
          {Array.from({ length: 9 }, (_, index) => index + 2).map((count) => (
            <option key={count} value={count}>
              {count} players
            </option>
          ))}
        </select>
      </label>
      <button
        className="mt-4 w-full border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
        disabled={props.busy}
        type="submit"
      >
        Create Room
      </button>
    </form>
  );
}

function RoomLobby(props: {
  account: Account | null;
  busy: boolean;
  confirmingHotSeatAnswer: boolean;
  confirmingPass: boolean;
  currentPlayer: RoomPlayer | undefined;
  fastestFinger: FastestFingerState | null;
  fastestFingerOrder: FastestFingerItemKey[];
  hotSeat: HotSeatState | null;
  hotSeatRevealPending: boolean;
  isHost: boolean;
  onCancelHotSeatAnswer: () => void;
  onConfirmHotSeatAnswer: () => void;
  onConfirmPass: () => void;
  onContinueHotSeat: () => void;
  onLeaveRoom: () => void;
  onRefreshHotSeat: () => void;
  onRefreshFastestFinger: () => void;
  onRefreshRoom: () => void;
  onSelectHotSeatAnswer: (answer: HotSeatAnswerKey) => void;
  onStartRoom: () => void;
  onSubmitFastestFinger: (order: FastestFingerItemKey[]) => void;
  onTogglePassConfirm: (value: boolean) => void;
  onUpdateFastestFingerOrder: (order: FastestFingerItemKey[]) => void;
  onUpdateReady: (isReady: boolean) => void;
  onUseLifeline: (lifeline: "5050" | "audience" | "pass") => void;
  realtimeStatus: string;
  room: Room;
  selectedHotSeatAnswer: HotSeatAnswerKey | null;
  timerNow: number;
}) {
  const activePlayers = props.room.players.filter((player) => !player.leftAt);
  const waiting = props.room.status === "waiting";
  const host = props.room.players.find(
    (player) => player.accountId === props.room.hostAccountId,
  );

  return (
    <div className="grid gap-4">
      <div className="border border-[#244b91] bg-[#061a3e] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
              Room code
            </p>
            <h2 className="mt-2 font-mono text-4xl font-black tracking-[0.2em] text-white">
              {props.room.code}
            </h2>
          </div>
          <span className="border border-[#f6d37a]/55 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#f6d37a]">
            {props.room.status.replace("_", " ")}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-blue-100/75">
          {props.room.activePlayerCount} of {props.room.selectedPlayerCount}{" "}
          players joined. Share this code with family or friends.
        </p>
      </div>

      <div className="grid gap-2">
        {props.room.players.map((player) => (
          <div
            className={`border p-3 ${
              player.leftAt
                ? "border-white/10 bg-white/5 text-blue-100/45"
                : "border-[#244b91] bg-[#071a3d]"
            }`}
            key={player.accountId}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-black">{player.displayName}</p>
                <p className="font-mono text-xs text-blue-100/58">
                  @{player.username}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {player.isHost && (
                  <span className="border border-[#f6d37a]/60 px-2 py-1 text-xs font-black uppercase text-[#f6d37a]">
                    Host
                  </span>
                )}
                <span
                  className={`border px-2 py-1 text-xs font-black uppercase ${
                    player.leftAt
                      ? "border-white/15 text-blue-100/45"
                      : player.isReady
                        ? "border-emerald-300 text-emerald-200"
                        : "border-[#ff9f2f] text-[#ffcb8c]"
                  }`}
                >
                  {player.leftAt
                    ? player.leftDuringGame
                      ? "Left game"
                      : "Left room"
                    : player.isReady
                      ? "Ready"
                      : "Not ready"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {props.room.status === "fastest_finger" && (
        <FastestFingerPanel
          busy={props.busy}
          fastestFinger={props.fastestFinger}
          order={props.fastestFingerOrder}
          onRefresh={props.onRefreshFastestFinger}
          onSubmit={props.onSubmitFastestFinger}
          onUpdateOrder={props.onUpdateFastestFingerOrder}
          timerNow={props.timerNow}
        />
      )}

      {props.room.status === "hot_seat" && (
        <HotSeatPanel
          account={props.account}
          busy={props.busy}
          confirmingAnswer={props.confirmingHotSeatAnswer}
          confirmingPass={props.confirmingPass}
          hotSeat={props.hotSeat}
          onCancelAnswer={props.onCancelHotSeatAnswer}
          onConfirmPass={props.onConfirmPass}
          onConfirmAnswer={props.onConfirmHotSeatAnswer}
          onContinue={props.onContinueHotSeat}
          onRefresh={props.onRefreshHotSeat}
          onSelectAnswer={props.onSelectHotSeatAnswer}
          onTogglePassConfirm={props.onTogglePassConfirm}
          onUseLifeline={props.onUseLifeline}
          revealPending={props.hotSeatRevealPending}
          selectedAnswer={props.selectedHotSeatAnswer}
        />
      )}

      <GameStateDebugPanel
        activePlayerCount={activePlayers.length}
        eligiblePlayerCount={props.room.gameState?.eligibleAccountIds.length ?? 0}
        gameStateId={props.room.gameState?.id ?? "Not created"}
        hostDisplayName={host?.displayName ?? "No host"}
        realtimeStatus={props.realtimeStatus}
        roomCode={props.room.code}
        roomStatus={props.room.status}
        selectedPlayerCount={props.room.selectedPlayerCount}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        {waiting && props.currentPlayer && (
          <button
            className="border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={props.busy}
            onClick={() => props.onUpdateReady(!props.currentPlayer?.isReady)}
            type="button"
          >
            {props.currentPlayer.isReady ? "Not Ready" : "Ready"}
          </button>
        )}
        {props.isHost && waiting && (
          <button
            className="border border-emerald-300 bg-emerald-300 px-4 py-3 font-black text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={props.busy || !props.room.canStart}
            onClick={props.onStartRoom}
            title={
              props.room.canStart
                ? "Start room"
                : "Room must be full and every player must be ready."
            }
            type="button"
          >
            Start Game
          </button>
        )}
        <button
          className="border border-[#244b91] bg-[#0d2450]/80 px-4 py-3 font-black text-blue-100"
          disabled={props.busy}
          onClick={props.onRefreshRoom}
          type="button"
        >
          Refresh Room
        </button>
        {props.currentPlayer && (
          <button
            className="border border-[#ff5e5e]/70 bg-[#320f18]/85 px-4 py-3 font-black text-red-50"
            disabled={props.busy}
            onClick={props.onLeaveRoom}
            type="button"
          >
            Leave Room
          </button>
        )}
      </div>

      {!props.room.canStart && waiting && (
        <p className="text-sm leading-6 text-blue-100/65">
          Start unlocks only when exactly {props.room.selectedPlayerCount}{" "}
          players are in the room and every player is ready.
        </p>
      )}

      <p className="text-xs text-blue-100/45">
        Active players: {activePlayers.length}. Host transfer happens
        automatically if the host leaves.
      </p>
    </div>
  );
}

function FastestFingerPanel(props: {
  busy: boolean;
  fastestFinger: FastestFingerState | null;
  onRefresh: () => void;
  onSubmit: (order: FastestFingerItemKey[]) => void;
  onUpdateOrder: (order: FastestFingerItemKey[]) => void;
  order: FastestFingerItemKey[];
  timerNow: number;
}) {
  const [draggingKey, setDraggingKey] = useState<FastestFingerItemKey | null>(
    null,
  );

  if (!props.fastestFinger) {
    return (
      <div className="border border-[#f6d37a]/35 bg-[#061733]/92 p-4">
        <p className="text-sm font-bold text-blue-100">
          Loading Fastest Finger...
        </p>
        <button
          className="mt-3 border border-[#244b91] bg-[#0d2450]/80 px-4 py-3 font-black text-blue-100"
          disabled={props.busy}
          onClick={props.onRefresh}
          type="button"
        >
          Refresh Fastest Finger
        </button>
      </div>
    );
  }

  const keyedItems = new Map(
    props.fastestFinger.items.map((item) => [item.key, item.text]),
  );
  const clientElapsedMs = props.timerNow - props.fastestFinger.loadedAt;
  const synchronizedNow =
    new Date(props.fastestFinger.serverNow).getTime() + clientElapsedMs;
  const remainingMs = Math.max(
    0,
    new Date(props.fastestFinger.endsAt).getTime() - synchronizedNow,
  );
  const progressPercent = Math.max(0, Math.min(100, (remainingMs / 30000) * 100));
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const submitted = Boolean(props.fastestFinger.submission);

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= props.order.length || submitted) {
      return;
    }

    const next = [...props.order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    props.onUpdateOrder(next);
  }

  function dropOn(targetKey: FastestFingerItemKey) {
    if (!draggingKey || draggingKey === targetKey || submitted) {
      setDraggingKey(null);
      return;
    }

    const from = props.order.indexOf(draggingKey);
    const to = props.order.indexOf(targetKey);

    if (from !== -1 && to !== -1) {
      moveItem(from, to);
    }

    setDraggingKey(null);
  }

  return (
    <div className="border border-[#f6d37a]/45 bg-[#040c1d] p-4 shadow-[0_0_45px_rgba(246,211,122,0.13)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
            Fastest Finger First
          </p>
          <h3 className="mt-2 text-2xl font-black text-white">
            Round {props.fastestFinger.roundNumber}
          </h3>
        </div>
        <div className="border border-[#f6d37a]/50 bg-[#071a3d] px-3 py-2 text-right">
          <p className="font-mono text-2xl font-black text-[#f6d37a]">
            {secondsLeft}
          </p>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100/55">
            seconds
          </p>
        </div>
      </div>

      <div className="mt-4 h-4 overflow-hidden border border-[#f6d37a]/45 bg-[#020712]">
        <div
          className="h-full bg-[linear-gradient(90deg,#f6d37a,#ff9f2f,#ffffff)] shadow-[0_0_24px_rgba(255,159,47,0.95)] transition-[width] duration-200"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <p className="mt-4 text-lg font-black leading-7 text-white">
        {props.fastestFinger.prompt}
      </p>

      <div className="mt-4 grid gap-2">
        {props.order.map((key, index) => (
          <div
            className={`border bg-[#071a3d] p-3 transition ${
              draggingKey === key
                ? "border-[#ff9f2f] opacity-80"
                : "border-[#244b91]"
            } ${submitted ? "opacity-70" : "cursor-grab"}`}
            draggable={!submitted}
            key={key}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggingKey(key)}
            onDrop={() => dropOn(key)}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center border border-[#f6d37a]/55 font-mono font-black text-[#f6d37a]">
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 font-black text-blue-50">
                {keyedItems.get(key)}
              </p>
              <div className="flex shrink-0 gap-1">
                <button
                  aria-label={`Move ${keyedItems.get(key)} up`}
                  className="border border-[#244b91] px-2 py-1 font-black text-blue-100 disabled:opacity-35"
                  disabled={props.busy || submitted || index === 0}
                  onClick={() => moveItem(index, index - 1)}
                  type="button"
                >
                  ↑
                </button>
                <button
                  aria-label={`Move ${keyedItems.get(key)} down`}
                  className="border border-[#244b91] px-2 py-1 font-black text-blue-100 disabled:opacity-35"
                  disabled={props.busy || submitted || index === props.order.length - 1}
                  onClick={() => moveItem(index, index + 1)}
                  type="button"
                >
                  ↓
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {submitted ? (
        <div className="mt-4 border border-[#244b91] bg-[#061a3e] p-4 text-sm font-bold leading-6 text-blue-100">
          {props.fastestFinger.winner ? (
            <span className="text-[#f6d37a]">
              Winner: {props.fastestFinger.winner.displayName}
            </span>
          ) : (
            "Waiting for other players..."
          )}
        </div>
      ) : (
        <button
          className="mt-4 w-full border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={props.busy || remainingMs <= 0}
          onClick={() => props.onSubmit(props.order)}
          type="button"
        >
          Submit Order
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-blue-100/58">
        <span>
          Submissions: {props.fastestFinger.submissionCount} /{" "}
          {props.fastestFinger.eligiblePlayerCount}
        </span>
        <button
          className="border border-[#244b91] px-3 py-2 font-black text-blue-100"
          disabled={props.busy}
          onClick={props.onRefresh}
          type="button"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

function HotSeatPanel(props: {
  account: Account | null;
  busy: boolean;
  confirmingAnswer: boolean;
  confirmingPass: boolean;
  hotSeat: HotSeatState | null;
  onCancelAnswer: () => void;
  onConfirmAnswer: () => void;
  onConfirmPass: () => void;
  onContinue: () => void;
  onRefresh: () => void;
  onSelectAnswer: (answer: HotSeatAnswerKey) => void;
  onTogglePassConfirm: (value: boolean) => void;
  onUseLifeline: (lifeline: "5050" | "audience" | "pass") => void;
  revealPending: boolean;
  selectedAnswer: HotSeatAnswerKey | null;
}) {
  if (!props.hotSeat) {
    return (
      <div className="border border-[#f6d37a]/35 bg-[#061733]/92 p-4">
        <p className="text-sm font-bold text-blue-100">Loading Hot Seat...</p>
        <button
          className="mt-3 border border-[#244b91] bg-[#0d2450]/80 px-4 py-3 font-black text-blue-100"
          disabled={props.busy}
          onClick={props.onRefresh}
          type="button"
        >
          Refresh Hot Seat
        </button>
      </div>
    );
  }

  const isHotSeatPlayer =
    props.account?.id === props.hotSeat.hotSeatPlayer.accountId;
  const locked = props.busy || props.revealPending || props.hotSeat.status !== "awaiting_answer";
  const canUseLifelines = isHotSeatPlayer && props.hotSeat.status === "awaiting_answer";
  const passAvailable = props.hotSeat.passAvailable;
  const answerRows: Array<[HotSeatAnswerKey, string]> = [
    ["A", props.hotSeat.question.answerA],
    ["B", props.hotSeat.question.answerB],
    ["C", props.hotSeat.question.answerC],
    ["D", props.hotSeat.question.answerD],
  ];

  function answerClass(answer: HotSeatAnswerKey) {
    if (props.hotSeat?.removedAnswers.includes(answer)) {
      return "border-white/10 bg-[#020712] text-blue-100/28 line-through";
    }

    const revealed =
      props.hotSeat?.status === "revealed_correct" ||
      props.hotSeat?.status === "revealed_wrong" ||
      props.hotSeat?.status === "turn_complete";

    if (revealed && props.hotSeat?.correctAnswer === answer) {
      return "border-emerald-300 bg-emerald-400 text-[#04120c]";
    }

    if (
      revealed &&
      props.hotSeat?.finalAnswer === answer &&
      props.hotSeat?.isCorrect === false
    ) {
      return "border-[#ff5e5e] bg-[#7a1620] text-red-50";
    }

    if (!revealed && props.selectedAnswer === answer) {
      return "border-[#ff9f2f] bg-[#ff9f2f] text-[#071225]";
    }

    return "border-[#244b91] bg-[#071a3d] text-blue-50 hover:border-[#f6d37a]/80";
  }

  return (
    <div className="grid gap-4 border border-[#f6d37a]/45 bg-[#030914] p-4 shadow-[0_0_50px_rgba(246,211,122,0.14)]">
      <div className="border border-[#244b91] bg-[#061733] p-4">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
          Hot Seat
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-3xl font-black text-white">
              {props.hotSeat.hotSeatPlayer.displayName}
            </h3>
            <p className="mt-1 text-sm font-bold text-blue-100/70">
              Level {props.hotSeat.currentLevel} for{" "}
              {formatPrize(props.hotSeat.currentPrize)}
            </p>
          </div>
          <span className="border border-[#f6d37a]/55 px-3 py-2 font-mono text-sm font-black text-[#f6d37a]">
            {props.hotSeat.status.replace("_", " ")}
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_170px]">
        <section className="border border-[#244b91] bg-[#061a3e] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#f6d37a]">
              {props.hotSeat.question.category}
            </span>
            <span className="font-mono text-xs font-black text-blue-100/70">
              {formatPrize(props.hotSeat.question.prizeAmount)}
            </span>
          </div>
          <p className="mt-4 text-xl font-black leading-8 text-white">
            {props.hotSeat.question.questionText}
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button
              className="border border-[#f6d37a]/55 bg-[#071a3d] px-3 py-3 text-sm font-black text-[#f6d37a] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-blue-100/35"
              disabled={locked || !canUseLifelines || props.hotSeat.used5050}
              onClick={() => props.onUseLifeline("5050")}
              type="button"
            >
              50:50
            </button>
            <button
              className="border border-[#f6d37a]/55 bg-[#071a3d] px-3 py-3 text-sm font-black text-[#f6d37a] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-blue-100/35"
              disabled={locked || !canUseLifelines || props.hotSeat.usedAudience}
              onClick={() => props.onUseLifeline("audience")}
              type="button"
            >
              Ask The Audience
            </button>
            <button
              className="border border-[#f6d37a]/55 bg-[#071a3d] px-3 py-3 text-sm font-black text-[#f6d37a] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-blue-100/35"
              disabled={
                locked ||
                !canUseLifelines ||
                props.hotSeat.usedPass ||
                !passAvailable
              }
              onClick={() => props.onTogglePassConfirm(true)}
              title={
                passAvailable
                  ? "Use Pass"
                  : "Pass needs another eligible player."
              }
              type="button"
            >
              Pass
            </button>
          </div>

          {!passAvailable && isHotSeatPlayer && !props.hotSeat.usedPass && (
            <p className="mt-2 text-xs font-bold text-blue-100/55">
              Pass is unavailable because no other eligible player can take over.
            </p>
          )}

          {props.confirmingPass && (
            <div className="mt-4 border border-[#ff9f2f] bg-[#281406] p-4">
              <p className="text-lg font-black text-white">
                Use Pass and move to the back of the queue?
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  className="border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225]"
                  disabled={props.busy}
                  onClick={props.onConfirmPass}
                  type="button"
                >
                  Yes, use Pass
                </button>
                <button
                  className="border border-[#244b91] bg-[#0d2450]/80 px-4 py-3 font-black text-blue-100"
                  disabled={props.busy}
                  onClick={() => props.onTogglePassConfirm(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-2">
            {answerRows.map(([answer, text]) => (
              <button
                className={`w-full border px-3 py-3 text-left font-black transition disabled:cursor-not-allowed ${answerClass(
                  answer,
                )}`}
                disabled={
                  locked ||
                  !isHotSeatPlayer ||
                  props.hotSeat?.removedAnswers.includes(answer)
                }
                key={answer}
                onClick={() => props.onSelectAnswer(answer)}
                type="button"
              >
                <span className="mr-3 font-mono">{answer}</span>
                {text}
              </button>
            ))}
          </div>

          {props.hotSeat.audiencePercentages && (
            <div className="mt-4 border border-[#f6d37a]/45 bg-[#050f25] p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6d37a]">
                Audience result
              </p>
              <div className="mt-3 grid gap-2">
                {answerRows.map(([answer]) => {
                  const value = props.hotSeat?.audiencePercentages?.[answer] ?? 0;
                  const removed = props.hotSeat?.removedAnswers.includes(answer);

                  return (
                    <div className="grid gap-1" key={answer}>
                      <div className="flex items-center justify-between gap-3 text-xs font-black">
                        <span className={removed ? "text-blue-100/35" : "text-blue-50"}>
                          {answer}
                        </span>
                        <span className={removed ? "text-blue-100/35" : "text-[#f6d37a]"}>
                          {value}%
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden border border-[#244b91] bg-[#020712]">
                        <div
                          className={`h-full ${
                            removed
                              ? "bg-white/10"
                              : "bg-[linear-gradient(90deg,#244b91,#f6d37a)]"
                          }`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!isHotSeatPlayer && props.hotSeat.status === "awaiting_answer" && (
            <p className="mt-4 border border-[#244b91] bg-[#050f25] p-3 text-sm font-bold leading-6 text-blue-100/75">
              Waiting for {props.hotSeat.hotSeatPlayer.displayName} to lock a
              final answer.
            </p>
          )}

          {props.confirmingAnswer &&
            props.selectedAnswer &&
            props.hotSeat.status === "awaiting_answer" && (
              <div className="mt-4 border border-[#ff9f2f] bg-[#281406] p-4">
                <p className="text-lg font-black text-white">
                  Is that your final answer?
                </p>
                <p className="mt-1 font-mono text-sm font-black text-[#ffcb8c]">
                  Selected answer {props.selectedAnswer}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    className="border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225]"
                    disabled={props.busy}
                    onClick={props.onConfirmAnswer}
                    type="button"
                  >
                    Yes
                  </button>
                  <button
                    className="border border-[#244b91] bg-[#0d2450]/80 px-4 py-3 font-black text-blue-100"
                    disabled={props.busy}
                    onClick={props.onCancelAnswer}
                    type="button"
                  >
                    No
                  </button>
                </div>
              </div>
            )}

          {props.revealPending && (
            <div className="mt-4 border border-[#f6d37a]/55 bg-[#050f25] p-4">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f6d37a]">
                Final answer locked...
              </p>
              <div className="mt-3 h-3 overflow-hidden border border-[#f6d37a]/40 bg-[#020712]">
                <div className="timer-flare h-full w-full" />
              </div>
            </div>
          )}

          {props.hotSeat.status === "revealed_correct" && (
            <div className="mt-4 border border-emerald-300 bg-[#062015] p-4">
              <p className="text-xl font-black text-emerald-100">Correct</p>
              <p className="mt-2 text-sm font-bold leading-6 text-emerald-50/80">
                {formatPrize(props.hotSeat.currentPrize)} is secured for this
                level. Continue to the next question.
              </p>
              <button
                className="mt-4 w-full border border-emerald-300 bg-emerald-300 px-4 py-3 font-black text-[#071225]"
                disabled={props.busy}
                onClick={props.onContinue}
                type="button"
              >
                Next Question
              </button>
            </div>
          )}

          {(props.hotSeat.status === "revealed_wrong" ||
            props.hotSeat.status === "turn_complete") && (
            <div className="mt-4 border border-[#ff5e5e]/70 bg-[#320f18] p-4">
              <p className="text-xl font-black text-red-50">
                {props.hotSeat.isCorrect ? "Top prize reached" : "Incorrect"}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-red-50/84">
                {props.hotSeat.hotSeatPlayer.displayName} finishes this turn
                with {formatPrize(props.hotSeat.finalWinnings ?? 0)}.
              </p>
              {isHotSeatPlayer && (
                <button
                  className="mt-4 w-full border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225]"
                  disabled={props.busy}
                  onClick={props.onContinue}
                  type="button"
                >
                  Continue
                </button>
              )}
            </div>
          )}
        </section>

        <aside className="border border-[#244b91] bg-[#050f25] p-3">
          <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.2em] text-[#f6d37a]">
            Prize ladder
          </p>
          <ol className="grid gap-1">
            {[...props.hotSeat.ladder].reverse().map((item) => (
              <li
                className={`border px-2 py-1.5 text-right font-mono text-xs font-black ${
                  item.isCurrent
                    ? "border-[#f6d37a] bg-[#f6d37a] text-[#071225]"
                    : item.isSafetyNet
                      ? "border-[#f6d37a]/60 bg-[#172a48] text-[#f6d37a]"
                      : "border-[#1c3f7d] bg-[#071a3d] text-blue-100"
                }`}
                key={item.level}
              >
                {formatPrize(item.amount)}
              </li>
            ))}
          </ol>
          <div className="mt-3 border border-[#244b91] bg-[#071a3d] p-2 text-xs font-bold leading-5 text-blue-100/70">
            Correct: {props.hotSeat.questionsCorrect}. Completed levels:{" "}
            {props.hotSeat.levelsCompleted}.
          </div>
        </aside>
      </div>
    </div>
  );
}

function GameStateDebugPanel(props: {
  activePlayerCount: number;
  eligiblePlayerCount: number;
  gameStateId: string;
  hostDisplayName: string;
  realtimeStatus: string;
  roomCode: string;
  roomStatus: RoomStatus;
  selectedPlayerCount: number;
}) {
  return (
    <div className="border border-[#f6d37a]/45 bg-[#050f25] p-4">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
        Temporary game-state debug
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        {[
          ["Room code", props.roomCode],
          ["Room status", props.roomStatus.replace("_", " ")],
          ["Game state", props.gameStateId],
          ["Host", props.hostDisplayName],
          [
            "Players",
            `${props.activePlayerCount} / ${props.selectedPlayerCount}`,
          ],
          ["Eligible", props.eligiblePlayerCount.toLocaleString()],
          ["Sync", props.realtimeStatus],
        ].map(([label, value]) => (
          <div className="border border-[#244b91] bg-[#071a3d] p-2" key={label}>
            <p className="font-black uppercase tracking-[0.08em] text-blue-100/50">
              {label}
            </p>
            <p className="mt-1 break-words font-mono font-black text-[#f6d37a]">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountPanel(props: {
  activePanel: Panel;
  busy: boolean;
  loginPin: string;
  loginUsername: string;
  onLoginPinChange: (value: string) => void;
  onLoginUsernameChange: (value: string) => void;
  onSignupDisplayNameChange: (value: string) => void;
  onSignupPinChange: (value: string) => void;
  onSignupUsernameChange: (value: string) => void;
  signupDisplayName: string;
  signupPin: string;
  signupUsername: string;
  submitLogin: (event: FormEvent<HTMLFormElement>) => void;
  submitSignup: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (props.activePanel === "login") {
    return (
      <form
        className="border border-[#244b91] bg-[#061a3e] p-4"
        onSubmit={props.submitLogin}
      >
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
          Account login
        </p>
        <h2 className="mt-3 text-2xl font-black">Log In</h2>
        <Field
          label="Username"
          maxLength={20}
          onChange={props.onLoginUsernameChange}
          placeholder="example: abdul"
          value={props.loginUsername}
        />
        <Field
          inputMode="numeric"
          label="4-digit PIN"
          maxLength={4}
          onChange={props.onLoginPinChange}
          placeholder="1234"
          type="password"
          value={props.loginPin}
        />
        <button
          className="mt-4 w-full border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={props.busy}
          type="submit"
        >
          Log In
        </button>
      </form>
    );
  }

  return (
    <form
      className="border border-[#244b91] bg-[#061a3e] p-4"
      onSubmit={props.submitSignup}
    >
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
        New account
      </p>
      <h2 className="mt-3 text-2xl font-black">Create Account</h2>
      <Field
        label="Username"
        maxLength={20}
        onChange={props.onSignupUsernameChange}
        placeholder="letters, numbers, underscores"
        value={props.signupUsername}
      />
      <Field
        label="Display name"
        maxLength={24}
        onChange={props.onSignupDisplayNameChange}
        placeholder="shown in family rooms"
        value={props.signupDisplayName}
      />
      <Field
        inputMode="numeric"
        label="4-digit PIN"
        maxLength={4}
        onChange={props.onSignupPinChange}
        placeholder="1234"
        type="password"
        value={props.signupPin}
      />
      <button
        className="mt-4 w-full border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
        disabled={props.busy}
        type="submit"
      >
        Create Account
      </button>
    </form>
  );
}

function Field(props: {
  inputMode?: "numeric";
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="mt-4 block text-sm font-bold text-blue-50">
      {props.label}
      <input
        className="mt-2 w-full border border-[#244b91] bg-[#020712] px-3 py-3 text-white outline-none transition placeholder:text-blue-100/32 focus:border-[#f6d37a]"
        inputMode={props.inputMode}
        maxLength={props.maxLength}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        type={props.type ?? "text"}
        value={props.value}
      />
    </label>
  );
}

function ProfilePanel(props: {
  account: Account;
  busy: boolean;
  displayNameDraft: string;
  joinedDate: string;
  onDisplayNameChange: (value: string) => void;
  onSubmitDisplayName: (event: FormEvent<HTMLFormElement>) => void;
  stats: AccountStats;
}) {
  return (
    <div className="grid gap-4">
      <div className="border border-[#244b91] bg-[#061a3e] p-4">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
          Logged in
        </p>
        <h2 className="mt-3 text-3xl font-black">{props.account.displayName}</h2>
        <p className="mt-2 text-sm text-blue-100/75">
          Username:{" "}
          <span className="font-mono text-[#f6d37a]">
            {props.account.username}
          </span>
          {props.joinedDate ? ` | Joined ${props.joinedDate}` : ""}
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={props.onSubmitDisplayName}
        >
          <input
            className="min-w-0 flex-1 border border-[#244b91] bg-[#020712] px-3 py-3 text-white outline-none focus:border-[#f6d37a]"
            maxLength={24}
            onChange={(event) => props.onDisplayNameChange(event.target.value)}
            value={props.displayNameDraft}
          />
          <button
            className="border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={props.busy}
            type="submit"
          >
            Save Name
          </button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {statLabels.map(([key, label]) => (
          <div className="border border-[#244b91] bg-[#071a3d] p-3" key={key}>
            <p className="font-mono text-xl font-black text-[#f6d37a]">
              {formatStat(key, props.stats[key])}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-blue-100/65">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionFoundationPanel(props: {
  account: Account;
  busy: boolean;
  onLoadAdminReports: () => void;
  onLoadQuestion: () => void;
  onQuestionLevelChange: (value: number) => void;
  onReportReasonChange: (value: ReportReason) => void;
  onSubmitQuestionReport: () => void;
  question: Question | null;
  questionLevel: number;
  reportReason: ReportReason;
  reportedQuestions: ReportedQuestion[];
}) {
  return (
    <div className="border border-[#244b91] bg-[#061a3e] p-4">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
        Question database
      </p>
      <h2 className="mt-3 text-2xl font-black">Question Bank Test</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block text-sm font-bold text-blue-50">
          Level
          <select
            className="mt-2 w-full border border-[#244b91] bg-[#020712] px-3 py-3 text-white outline-none transition focus:border-[#f6d37a]"
            onChange={(event) =>
              props.onQuestionLevelChange(Number(event.target.value))
            }
            value={props.questionLevel}
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((level) => (
              <option key={level} value={level}>
                Level {level}
              </option>
            ))}
          </select>
        </label>
        <button
          className="self-end border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={props.busy}
          onClick={props.onLoadQuestion}
          type="button"
        >
          Load Question
        </button>
      </div>

      {props.question && (
        <div className="mt-4 border border-[#244b91] bg-[#071a3d] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#f6d37a]">
              {props.question.category}
            </span>
            <span className="font-mono text-xs font-black text-blue-100/70">
              Level {props.question.level} | $
              {props.question.prizeAmount.toLocaleString()}
            </span>
          </div>
          <p className="mt-3 text-lg font-black leading-7">
            {props.question.questionText}
          </p>
          <div className="mt-4 grid gap-2">
            {[
              ["A", props.question.answerA],
              ["B", props.question.answerB],
              ["C", props.question.answerC],
              ["D", props.question.answerD],
            ].map(([letter, answer]) => (
              <div
                className="border border-[#244b91] bg-[#020712] px-3 py-2 text-sm font-bold text-blue-50"
                key={letter}
              >
                <span className="mr-2 font-mono text-[#f6d37a]">{letter}</span>
                {answer}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block text-sm font-bold text-blue-50">
              Report reason
              <select
                className="mt-2 w-full border border-[#244b91] bg-[#020712] px-3 py-3 text-white outline-none transition focus:border-[#f6d37a]"
                onChange={(event) =>
                  props.onReportReasonChange(event.target.value as ReportReason)
                }
                value={props.reportReason}
              >
                {reportReasons.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="self-end border border-[#ff9f2f] bg-[#ff9f2f] px-4 py-3 font-black text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={props.busy}
              onClick={props.onSubmitQuestionReport}
              type="button"
            >
              Report Question
            </button>
          </div>
        </div>
      )}

      {props.account.isAdmin && (
        <div className="mt-4 border border-[#f6d37a]/45 bg-[#050f25] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-black text-[#f6d37a]">
              Admin report review
            </p>
            <button
              className="border border-[#244b91] bg-[#0d2450]/80 px-3 py-2 text-sm font-black text-blue-100 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={props.busy}
              onClick={props.onLoadAdminReports}
              type="button"
            >
              Load Reports
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            {props.reportedQuestions.length === 0 ? (
              <p className="text-sm text-blue-100/65">No reports loaded.</p>
            ) : (
              props.reportedQuestions.map((question) => (
                <div
                  className="border border-[#244b91] bg-[#071a3d] p-3"
                  key={question.id}
                >
                  <p className="text-sm font-black">{question.questionText}</p>
                  <p className="mt-1 text-xs text-blue-100/65">
                    Level {question.level} | {question.category} | Reports:{" "}
                    {question.reportCount} | Active:{" "}
                    {question.active ? "yes" : "no"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FastestFingerPreview() {
  return (
    <div className="border border-[#244b91] bg-[#061a3e] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
          Fastest Finger
        </p>
        <span className="font-mono text-sm font-black text-white">30</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden border border-[#f6d37a]/40 bg-[#020712]">
        <div className="timer-flare h-full w-full" />
      </div>
      <p className="mt-4 text-sm font-bold text-blue-100/80">
        Arrange the answers in the correct order before the flare reaches the
        end.
      </p>
    </div>
  );
}

function LadderPanel() {
  return (
    <aside className="border border-[#244b91] bg-[#050f25] p-3">
      <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.2em] text-[#f6d37a]">
        Ladder
      </p>
      <ol className="grid gap-1">
        {ladder.map((amount) => (
          <li
            className={`border px-2 py-1.5 text-right font-mono text-xs font-black ${
              amount === "$1,000,000"
                ? "border-[#f6d37a] bg-[#f6d37a] text-[#071225]"
                : amount === "$32,000" || amount === "$1,000"
                  ? "border-[#f6d37a]/60 bg-[#172a48] text-[#f6d37a]"
                  : "border-[#1c3f7d] bg-[#071a3d] text-blue-100"
            }`}
            key={amount}
          >
            {amount}
          </li>
        ))}
      </ol>
    </aside>
  );
}
