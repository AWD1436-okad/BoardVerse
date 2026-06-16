"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/final-answer/supabase-browser";

type Panel = "welcome" | "signup" | "login" | "home" | "create-room" | "join-room";
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

type GameResult = {
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

type ReportedQuestion = Question & {
  active: boolean;
  correctAnswer: string;
  createdAt: string;
  reportCount: number;
  reports?: Array<{
    accountId: string;
    createdAt: string;
    displayName: string;
    note: string | null;
    reason: ReportReason;
    roomId: string | null;
    turnId: string | null;
    username: string;
  }>;
};

type AdminQuestionSummary = {
  activeCount: number;
  answerBalance: Record<HotSeatAnswerKey, number>;
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
  results?: GameResult[];
  room?: Room | null;
  summary?: AdminQuestionSummary;
};

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

const reportReasonLabels = Object.fromEntries(reportReasons) as Record<
  ReportReason,
  string
>;

const questionCategories = [
  "Geography",
  "Science",
  "Nature",
  "Space",
  "Technology",
  "Landmarks",
  "Languages",
  "Food & Drink",
  "Weather & Climate",
  "Transport",
  "Oceans & Rivers",
  "Buildings & Architecture",
  "General Knowledge",
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
  const [activePanel, setActivePanel] = useState<Panel>("welcome");
  const [account, setAccount] = useState<Account | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [missingSetup, setMissingSetup] = useState<string[]>([]);
  const [message, setMessage] = useState("");
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
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [timerNow, setTimerTick] = useState(Date.now());
  const [question, setQuestion] = useState<Question | null>(null);
  const [reportedQuestions, setReportedQuestions] = useState<ReportedQuestion[]>(
    [],
  );
  const [adminQuestionSummary, setAdminQuestionSummary] =
    useState<AdminQuestionSummary | null>(null);
  const [adminQuestionLevel, setAdminQuestionLevel] = useState("all");
  const [adminQuestionCategory, setAdminQuestionCategory] = useState("");
  const [adminQuestionActive, setAdminQuestionActive] = useState("all");
  const [adminQuestionSearch, setAdminQuestionSearch] = useState("");
  const [adminQuestionMinReports, setAdminQuestionMinReports] = useState(0);
  const [showAdminTools, setShowAdminTools] = useState(false);

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
  const [hotSeatReportReason, setHotSeatReportReason] =
    useState<ReportReason>("wrong_answer");
  const [hotSeatReportNote, setHotSeatReportNote] = useState("");

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
        setActivePanel("home");
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

    if (room.status === "completed") {
      loadGameResults(false);
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
            } else if (room.status === "completed") {
              loadGameResults(false);
            }
          }, 150);
        },
      )
      .subscribe();

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
      setActivePanel("home");
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
      setActivePanel("home");
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
      setShowAdminTools(false);
      setActivePanel("welcome");
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
      setGameResults([]);
      setActivePanel("home");
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
      setGameResults([]);
      setJoinCode(data.room.code);
      setActivePanel("home");
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

      const accountStillActive = data.room.players.some(
        (player) => player.accountId === account?.id && !player.leftAt,
      );

      if (account && !accountStillActive) {
        setRoom(null);
        setFastestFinger(null);
        setHotSeat(null);
        setGameResults([]);
        if (showMessage) {
          setMessage("You are no longer active in that room.");
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
      setGameResults([]);
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

  function returnHomeFromCompletedGame() {
    setRoom(null);
    setFastestFinger(null);
    setHotSeat(null);
    setGameResults([]);
    setActivePanel("home");
    setMessage("Returned home. Your completed-game stats are saved.");
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
      setGameResults([]);
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
        loadGameResults(false);
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

  async function loadGameResults(showMessage = true) {
    if (!room?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/rooms/${room.id}/results`);
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        if (showMessage) {
          showApiError(data, "Could not load final results.");
        }
        return;
      }

      setGameResults(data.results ?? []);
      if (showMessage) {
        setMessage("Final results loaded.");
      }

      const session = await fetch("/api/account/session");
      const sessionData = (await session.json()) as ApiResponse;
      if (sessionData.account) {
        setAccount(sessionData.account);
      }
    } catch {
      if (showMessage) {
        setMessage("Could not load final results. Try again.");
      }
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

  async function submitHotSeatQuestionReport() {
    if (!room?.id || !hotSeat) {
      setMessage("Hot Seat question is not loaded yet.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/questions/${hotSeat.question.id}/report`, {
        body: JSON.stringify({
          note: hotSeatReportNote,
          reason: hotSeatReportReason,
          roomId: room.id,
          turnId: hotSeat.turnId,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        showApiError(data, "Could not report this question.");
        return;
      }

      setHotSeatReportNote("");
      setMessage(`Question report saved. Report count: ${data.reportCount ?? 1}.`);
    } catch {
      setMessage("Could not report this question. Try again.");
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
      const params = new URLSearchParams({
        active: adminQuestionActive,
        level: adminQuestionLevel,
        minReportCount: String(adminQuestionMinReports),
      });

      if (adminQuestionCategory) {
        params.set("category", adminQuestionCategory);
      }

      if (adminQuestionSearch.trim()) {
        params.set("search", adminQuestionSearch.trim());
      }

      const response = await fetch(`/api/admin/questions?${params.toString()}`);
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        showApiError(data, "Could not load admin questions.");
        return;
      }

      setAdminQuestionSummary(data.summary ?? null);
      setReportedQuestions(data.questions ?? []);
      setMessage(`Loaded ${data.questions?.length ?? 0} admin questions.`);
    } catch {
      setMessage("Could not load admin questions. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAdminQuestion(questionId: string, active: boolean) {
    if (!account?.isAdmin) {
      setMessage("Only admins can update questions.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/questions", {
        body: JSON.stringify({ active, questionId }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        showApiError(data, "Could not update question.");
        return;
      }

      await loadAdminReports();
      setMessage(active ? "Question reactivated." : "Question marked inactive.");
    } catch {
      setMessage("Could not update question. Try again.");
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
        </header>

        <div
          className={`mx-auto grid max-w-7xl gap-8 pb-10 pt-10 lg:min-h-[calc(100vh-92px)] lg:pt-0 ${
            room
              ? "items-start"
              : "items-center lg:grid-cols-[1.02fr_0.98fr]"
          }`}
          id="top"
        >
          {room ? (
            <section className="lg:col-span-2">
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
                gameResults={gameResults}
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
                onRefreshResults={() => loadGameResults(true)}
                onRefreshRoom={() => refreshRoom(true)}
                onReportHotSeatQuestion={submitHotSeatQuestionReport}
                onReportHotSeatReasonChange={setHotSeatReportReason}
                onReportHotSeatNoteChange={setHotSeatReportNote}
                onReturnHome={returnHomeFromCompletedGame}
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
                room={room}
                selectedHotSeatAnswer={selectedHotSeatAnswer}
                hotSeatReportNote={hotSeatReportNote}
                hotSeatReportReason={hotSeatReportReason}
                timerNow={timerNow}
              />
              <StatusMessage
                configured={configured}
                message={message}
                missingSetup={missingSetup}
              />
            </section>
          ) : (
            <>
              <BrandIntro />

              <section
                aria-label="Current player screen"
                className="relative border border-[#244b91] bg-[#040b19]/90 p-4 shadow-[14px_14px_0_rgba(214,161,50,0.18),0_0_60px_rgba(21,58,122,0.3)] sm:p-5"
                id="account-panel"
              >
                <div className="absolute -inset-px -z-10 bg-gradient-to-br from-[#f6d37a]/40 via-transparent to-[#2457b7]/50 blur-xl" />
                {!account ? (
                  <LoggedOutScreen
                    activePanel={activePanel}
                    busy={busy}
                    loginPin={loginPin}
                    loginUsername={loginUsername}
                    onBack={() => {
                      setActivePanel("welcome");
                      setMessage("");
                    }}
                    onLoginPinChange={setLoginPin}
                    onLoginUsernameChange={setLoginUsername}
                    onSelectPanel={(panel) => {
                      setActivePanel(panel);
                      setMessage("");
                    }}
                    onSignupDisplayNameChange={setSignupDisplayName}
                    onSignupPinChange={setSignupPin}
                    onSignupUsernameChange={setSignupUsername}
                    signupDisplayName={signupDisplayName}
                    signupPin={signupPin}
                    signupUsername={signupUsername}
                    submitLogin={submitLogin}
                    submitSignup={submitSignup}
                  />
                ) : activePanel === "create-room" || activePanel === "join-room" ? (
                  <RoomActionPanel
                    account={account}
                    activePanel={activePanel}
                    busy={busy}
                    joinCode={joinCode}
                    onCancel={() => {
                      setActivePanel("home");
                      setMessage("");
                    }}
                    onCreateRoom={createRoom}
                    onJoinCodeChange={setJoinCode}
                    onJoinRoom={joinRoom}
                    onPlayerCountChange={setRoomPlayerCount}
                    playerCount={roomPlayerCount}
                  />
                ) : (
                  <LoggedInHome
                    account={account}
                    busy={busy}
                    displayNameDraft={displayNameDraft}
                    joinedDate={joinedDate}
                    onDisplayNameChange={setDisplayNameDraft}
                    onLogout={logout}
                    onOpenAdmin={() => setShowAdminTools((value) => !value)}
                    onSelectPanel={(panel) => {
                      setActivePanel(panel);
                      setShowAdminTools(false);
                      setMessage("");
                    }}
                    onSubmitDisplayName={submitDisplayName}
                    showAdminTools={showAdminTools}
                    stats={stats}
                  />
                )}

                <StatusMessage
                  configured={configured}
                  message={message}
                  missingSetup={missingSetup}
                />

                {account?.isAdmin && showAdminTools && !room && (
                  <div className="mt-4">
                    <QuestionFoundationPanel
                      account={account}
                      adminActiveFilter={adminQuestionActive}
                      adminCategoryFilter={adminQuestionCategory}
                      adminLevelFilter={adminQuestionLevel}
                      adminMinReports={adminQuestionMinReports}
                      adminSearch={adminQuestionSearch}
                      adminSummary={adminQuestionSummary}
                      busy={busy}
                      onLoadAdminReports={loadAdminReports}
                      onLoadQuestion={loadQuestion}
                      onAdminActiveFilterChange={setAdminQuestionActive}
                      onAdminCategoryFilterChange={setAdminQuestionCategory}
                      onAdminLevelFilterChange={setAdminQuestionLevel}
                      onAdminMinReportsChange={setAdminQuestionMinReports}
                      onAdminSearchChange={setAdminQuestionSearch}
                      onQuestionLevelChange={setQuestionLevel}
                      onReportReasonChange={setReportReason}
                      onSubmitQuestionReport={submitQuestionReport}
                      onToggleQuestionActive={toggleAdminQuestion}
                      question={question}
                      questionLevel={questionLevel}
                      reportReason={reportReason}
                      reportedQuestions={reportedQuestions}
                    />
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function BrandIntro() {
  return (
    <section className="max-w-3xl">
      <p className="text-xs font-black uppercase tracking-[0.32em] text-[#f6d37a]">
        Original private quiz game
      </p>
      <h1 className="mt-5 text-5xl font-black leading-[0.91] tracking-normal text-white sm:text-7xl lg:text-8xl">
        Final Answer
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100/86 sm:text-xl">
        A polished browser quiz night for friends and family. Create a private
        room, share the code, race through Fastest Finger, then take the Hot
        Seat under the lights.
      </p>
    </section>
  );
}

function StatusMessage(props: {
  configured: boolean | null;
  message: string;
  missingSetup: string[];
}) {
  if (!props.message && props.configured !== false) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-3">
      {props.message && (
        <div className="border border-[#f6d37a]/35 bg-[#061733]/92 p-4 text-sm font-bold leading-6 text-blue-100">
          {props.message}
        </div>
      )}

      {props.configured === false && (
        <div className="border border-[#ff5e5e]/45 bg-[#320f18]/85 p-4 text-sm leading-6 text-red-50">
          <p className="font-black text-white">
            Supabase setup required before accounts can save.
          </p>
          <p className="mt-2">
            Missing:{" "}
            <span className="font-mono text-[#f6d37a]">
              {props.missingSetup.join(", ") || "Supabase environment variables"}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

function LoggedOutScreen(props: {
  activePanel: Panel;
  busy: boolean;
  loginPin: string;
  loginUsername: string;
  onBack: () => void;
  onLoginPinChange: (value: string) => void;
  onLoginUsernameChange: (value: string) => void;
  onSelectPanel: (panel: Panel) => void;
  onSignupDisplayNameChange: (value: string) => void;
  onSignupPinChange: (value: string) => void;
  onSignupUsernameChange: (value: string) => void;
  signupDisplayName: string;
  signupPin: string;
  signupUsername: string;
  submitLogin: (event: FormEvent<HTMLFormElement>) => void;
  submitSignup: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (props.activePanel === "signup" || props.activePanel === "login") {
    return (
      <div className="grid gap-4">
        <AccountPanel
          activePanel={props.activePanel}
          busy={props.busy}
          loginPin={props.loginPin}
          loginUsername={props.loginUsername}
          onLoginPinChange={props.onLoginPinChange}
          onLoginUsernameChange={props.onLoginUsernameChange}
          onSignupDisplayNameChange={props.onSignupDisplayNameChange}
          onSignupPinChange={props.onSignupPinChange}
          onSignupUsernameChange={props.onSignupUsernameChange}
          signupDisplayName={props.signupDisplayName}
          signupPin={props.signupPin}
          signupUsername={props.signupUsername}
          submitLogin={props.submitLogin}
          submitSignup={props.submitSignup}
        />
        <button
          className="border border-[#244b91] bg-[#0d2450]/80 px-4 py-3 font-black text-blue-100"
          disabled={props.busy}
          onClick={props.onBack}
          type="button"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="border border-[#244b91] bg-[#061a3e] p-4">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
        Start here
      </p>
      <h2 className="mt-3 text-3xl font-black">Play with a private room code</h2>
      <p className="mt-3 text-sm font-bold leading-6 text-blue-100/76">
        Create an account or log in with your username and 4-digit PIN. Rooms
        unlock after you are signed in.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          className="border border-[#f6d37a] bg-[#f6d37a] px-5 py-4 text-left font-black text-[#071225]"
          disabled={props.busy}
          onClick={() => props.onSelectPanel("signup")}
          type="button"
        >
          Create Account
        </button>
        <button
          className="border border-[#244b91] bg-[#0d2450]/80 px-5 py-4 text-left font-black text-blue-50"
          disabled={props.busy}
          onClick={() => props.onSelectPanel("login")}
          type="button"
        >
          Log In
        </button>
      </div>
    </div>
  );
}

function LoggedInHome(props: {
  account: Account;
  busy: boolean;
  displayNameDraft: string;
  joinedDate: string;
  onDisplayNameChange: (value: string) => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onSelectPanel: (panel: Panel) => void;
  onSubmitDisplayName: (event: FormEvent<HTMLFormElement>) => void;
  showAdminTools: boolean;
  stats: AccountStats;
}) {
  return (
    <div className="grid gap-4">
      <ProfilePanel
        account={props.account}
        busy={props.busy}
        displayNameDraft={props.displayNameDraft}
        joinedDate={props.joinedDate}
        onDisplayNameChange={props.onDisplayNameChange}
        onSubmitDisplayName={props.onSubmitDisplayName}
        stats={props.stats}
      />

      <div className="border border-[#244b91] bg-[#061a3e] p-4">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
          Game room
        </p>
        <h2 className="mt-3 text-2xl font-black">Choose your next move</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            className="border border-[#f6d37a] bg-[#f6d37a] px-5 py-4 text-left font-black text-[#071225]"
            disabled={props.busy}
            onClick={() => props.onSelectPanel("create-room")}
            type="button"
          >
            Create Room
          </button>
          <button
            className="border border-[#244b91] bg-[#0d2450]/80 px-5 py-4 text-left font-black text-blue-50"
            disabled={props.busy}
            onClick={() => props.onSelectPanel("join-room")}
            type="button"
          >
            Join Room
          </button>
        </div>
        <button
          className="mt-3 w-full border border-[#ff5e5e]/70 bg-[#320f18]/85 px-4 py-3 font-black text-red-50"
          disabled={props.busy}
          onClick={props.onLogout}
          type="button"
        >
          Log Out
        </button>
      </div>

      {props.account.isAdmin && (
        <button
          className="border border-[#f6d37a]/45 bg-[#0d2450]/80 px-4 py-3 text-sm font-black text-[#f6d37a]"
          disabled={props.busy}
          onClick={props.onOpenAdmin}
          type="button"
        >
          {props.showAdminTools ? "Hide Admin Tools" : "Open Admin Tools"}
        </button>
      )}
    </div>
  );
}

function RoomActionPanel(props: {
  account: Account | null;
  activePanel: Panel;
  busy: boolean;
  joinCode: string;
  onCancel: () => void;
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
        <button
          className="mt-3 w-full border border-[#244b91] bg-[#0d2450]/80 px-4 py-3 font-black text-blue-100"
          disabled={props.busy}
          onClick={props.onCancel}
          type="button"
        >
          Cancel
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
      <button
        className="mt-3 w-full border border-[#244b91] bg-[#0d2450]/80 px-4 py-3 font-black text-blue-100"
        disabled={props.busy}
        onClick={props.onCancel}
        type="button"
      >
        Cancel
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
  gameResults: GameResult[];
  hotSeat: HotSeatState | null;
  hotSeatReportNote: string;
  hotSeatReportReason: ReportReason;
  hotSeatRevealPending: boolean;
  isHost: boolean;
  onCancelHotSeatAnswer: () => void;
  onConfirmHotSeatAnswer: () => void;
  onConfirmPass: () => void;
  onContinueHotSeat: () => void;
  onLeaveRoom: () => void;
  onRefreshHotSeat: () => void;
  onRefreshFastestFinger: () => void;
  onRefreshResults: () => void;
  onRefreshRoom: () => void;
  onReportHotSeatNoteChange: (value: string) => void;
  onReportHotSeatQuestion: () => void;
  onReportHotSeatReasonChange: (value: ReportReason) => void;
  onReturnHome: () => void;
  onSelectHotSeatAnswer: (answer: HotSeatAnswerKey) => void;
  onStartRoom: () => void;
  onSubmitFastestFinger: (order: FastestFingerItemKey[]) => void;
  onTogglePassConfirm: (value: boolean) => void;
  onUpdateFastestFingerOrder: (order: FastestFingerItemKey[]) => void;
  onUpdateReady: (isReady: boolean) => void;
  onUseLifeline: (lifeline: "5050" | "audience" | "pass") => void;
  room: Room;
  selectedHotSeatAnswer: HotSeatAnswerKey | null;
  timerNow: number;
}) {
  const activePlayers = props.room.players.filter((player) => !player.leftAt);
  const hostPlayer = props.room.players.find(
    (player) => player.accountId === props.room.hostAccountId,
  );
  const waiting = props.room.status === "waiting";

  if (props.room.status === "completed") {
    return (
      <FinalResultsPanel
        busy={props.busy}
        onRefresh={props.onRefreshResults}
        onReturnHome={props.onReturnHome}
        results={props.gameResults}
        roomCode={props.room.code}
      />
    );
  }

  if (props.room.status === "fastest_finger") {
    return (
      <div className="grid gap-4">
        <GameStatusStrip
          hostName={hostPlayer?.displayName ?? "Host"}
          playerCount={activePlayers.length}
          roomCode={props.room.code}
          status="Fastest Finger"
        />
        <FastestFingerPanel
          busy={props.busy}
          fastestFinger={props.fastestFinger}
          order={props.fastestFingerOrder}
          onRefresh={props.onRefreshFastestFinger}
          onSubmit={props.onSubmitFastestFinger}
          onUpdateOrder={props.onUpdateFastestFingerOrder}
          timerNow={props.timerNow}
        />
      </div>
    );
  }

  if (props.room.status === "hot_seat") {
    return (
      <div className="grid gap-4">
        <GameStatusStrip
          hostName={hostPlayer?.displayName ?? "Host"}
          playerCount={activePlayers.length}
          roomCode={props.room.code}
          status="Hot Seat"
        />
        <HotSeatPanel
          account={props.account}
          busy={props.busy}
          confirmingAnswer={props.confirmingHotSeatAnswer}
          confirmingPass={props.confirmingPass}
          hotSeat={props.hotSeat}
          reportNote={props.hotSeatReportNote}
          reportReason={props.hotSeatReportReason}
          onCancelAnswer={props.onCancelHotSeatAnswer}
          onConfirmPass={props.onConfirmPass}
          onConfirmAnswer={props.onConfirmHotSeatAnswer}
          onContinue={props.onContinueHotSeat}
          onRefresh={props.onRefreshHotSeat}
          onReportNoteChange={props.onReportHotSeatNoteChange}
          onReportQuestion={props.onReportHotSeatQuestion}
          onReportReasonChange={props.onReportHotSeatReasonChange}
          onSelectAnswer={props.onSelectHotSeatAnswer}
          onTogglePassConfirm={props.onTogglePassConfirm}
          onUseLifeline={props.onUseLifeline}
          revealPending={props.hotSeatRevealPending}
          selectedAnswer={props.selectedHotSeatAnswer}
        />
      </div>
    );
  }

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

function GameStatusStrip(props: {
  hostName: string;
  playerCount: number;
  roomCode: string;
  status: string;
}) {
  return (
    <div className="border border-[#244b91] bg-[#061733]/92 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6d37a]">
            Room {props.roomCode}
          </p>
          <p className="mt-1 text-sm font-bold text-blue-100/68">
            Host: {props.hostName} | Players: {props.playerCount}
          </p>
        </div>
        <span className="border border-[#f6d37a]/55 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#f6d37a]">
          {props.status}
        </span>
      </div>
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
  reportNote: string;
  reportReason: ReportReason;
  onCancelAnswer: () => void;
  onConfirmAnswer: () => void;
  onConfirmPass: () => void;
  onContinue: () => void;
  onRefresh: () => void;
  onReportNoteChange: (value: string) => void;
  onReportQuestion: () => void;
  onReportReasonChange: (value: ReportReason) => void;
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

          <div className="mt-4 border border-[#244b91] bg-[#050f25] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f6d37a]">
                  Report question
                </p>
                <p className="mt-1 text-xs font-bold text-blue-100/55">
                  Report a typo, ambiguity, or possible answer issue.
                </p>
              </div>
              <button
                className="border border-[#ff9f2f] bg-[#ff9f2f] px-3 py-2 text-sm font-black text-[#071225] disabled:cursor-not-allowed disabled:opacity-55"
                disabled={props.busy}
                onClick={props.onReportQuestion}
                type="button"
              >
                Report
              </button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1.3fr]">
              <select
                className="border border-[#244b91] bg-[#020712] px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#f6d37a]"
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
              <input
                className="border border-[#244b91] bg-[#020712] px-3 py-3 text-sm font-bold text-white outline-none placeholder:text-blue-100/32 focus:border-[#f6d37a]"
                maxLength={240}
                onChange={(event) => props.onReportNoteChange(event.target.value)}
                placeholder="Optional note"
                value={props.reportNote}
              />
            </div>
          </div>

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

function placementLabel(place: number) {
  const suffix =
    place % 10 === 1 && place % 100 !== 11
      ? "st"
      : place % 10 === 2 && place % 100 !== 12
        ? "nd"
        : place % 10 === 3 && place % 100 !== 13
          ? "rd"
          : "th";

  return `${place}${suffix}`;
}

function FinalResultsPanel(props: {
  busy: boolean;
  onRefresh: () => void;
  onReturnHome: () => void;
  results: GameResult[];
  roomCode: string;
}) {
  const topResults = props.results.filter((result) => result.placement === 1);
  const tiedTop = topResults.length > 1;

  return (
    <div className="border border-[#f6d37a]/55 bg-[#030914] p-4 shadow-[0_0_50px_rgba(246,211,122,0.16)]">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
        Final Answer
      </p>
      <h3 className="mt-2 text-3xl font-black text-white">Final Results</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-blue-100/72">
        Room {props.roomCode} is complete. Stats are saved once when the final
        standings are created.
      </p>

      {props.results.length === 0 ? (
        <div className="mt-4 border border-[#244b91] bg-[#061a3e] p-4">
          <p className="text-sm font-bold text-blue-100">
            Final standings are being prepared.
          </p>
          <button
            className="mt-3 border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225]"
            disabled={props.busy}
            onClick={props.onRefresh}
            type="button"
          >
            Load Results
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 border border-[#f6d37a]/45 bg-[#281d06] p-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f6d37a]">
              {tiedTop ? "Tied winners" : "Winner"}
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {topResults.map((result) => result.displayName).join(" + ")}
            </p>
            <p className="mt-1 font-mono text-sm font-black text-[#f6d37a]">
              {formatPrize(topResults[0]?.finalWinnings ?? 0)}
            </p>
          </div>

          <div className="mt-4 grid gap-2">
            {props.results.map((result) => (
              <div
                className={`grid gap-3 border p-3 sm:grid-cols-[70px_1fr_auto] sm:items-center ${
                  result.placement === 1
                    ? "border-[#f6d37a] bg-[#0b234d]"
                    : "border-[#244b91] bg-[#061a3e]"
                }`}
                key={result.accountId}
              >
                <div className="font-mono text-xl font-black text-[#f6d37a]">
                  {placementLabel(result.placement)}
                </div>
                <div>
                  <p className="font-black text-white">{result.displayName}</p>
                  <p className="mt-1 text-xs font-bold text-blue-100/58">
                    Level {result.highestLevelReached} | Correct{" "}
                    {result.questionsAnsweredCorrectly} | Fastest Finger wins{" "}
                    {result.fastestFingerWins}
                  </p>
                </div>
                <p className="font-mono text-lg font-black text-white">
                  {formatPrize(result.finalWinnings)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-4">
        <button
          className="w-full border border-[#f6d37a] bg-[#f6d37a] px-4 py-3 font-black text-[#071225]"
          disabled={props.busy}
          onClick={props.onReturnHome}
          type="button"
        >
          Return Home
        </button>
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
  adminActiveFilter: string;
  adminCategoryFilter: string;
  adminLevelFilter: string;
  adminMinReports: number;
  adminSearch: string;
  adminSummary: AdminQuestionSummary | null;
  busy: boolean;
  onAdminActiveFilterChange: (value: string) => void;
  onAdminCategoryFilterChange: (value: string) => void;
  onAdminLevelFilterChange: (value: string) => void;
  onAdminMinReportsChange: (value: number) => void;
  onAdminSearchChange: (value: string) => void;
  onLoadAdminReports: () => void;
  onLoadQuestion: () => void;
  onQuestionLevelChange: (value: number) => void;
  onReportReasonChange: (value: ReportReason) => void;
  onSubmitQuestionReport: () => void;
  onToggleQuestionActive: (questionId: string, active: boolean) => void;
  question: Question | null;
  questionLevel: number;
  reportReason: ReportReason;
  reportedQuestions: ReportedQuestion[];
}) {
  return (
    <div className="border border-[#244b91] bg-[#061a3e] p-4">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
        Admin tools
      </p>
      <h2 className="mt-3 text-2xl font-black">Question Review</h2>
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
              Admin question review
            </p>
            <button
              className="border border-[#244b91] bg-[#0d2450]/80 px-3 py-2 text-sm font-black text-blue-100 disabled:cursor-not-allowed disabled:opacity-55"
              disabled={props.busy}
              onClick={props.onLoadAdminReports}
              type="button"
            >
              Load Questions
            </button>
          </div>

          {props.adminSummary && (
            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["Total", props.adminSummary.totalCount],
                  ["Active", props.adminSummary.activeCount],
                  ["Inactive", props.adminSummary.inactiveCount],
                  ["Reported", props.adminSummary.reportedCount],
                ].map(([label, value]) => (
                  <div
                    className="border border-[#244b91] bg-[#071a3d] p-3"
                    key={label}
                  >
                    <p className="font-mono text-xl font-black text-[#f6d37a]">
                      {Number(value).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-blue-100/62">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border border-[#244b91] bg-[#071a3d] p-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100/62">
                  Answer balance
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {(["A", "B", "C", "D"] as HotSeatAnswerKey[]).map((key) => (
                    <div
                      className="border border-[#1c3f7d] bg-[#020712] px-2 py-2 text-center"
                      key={key}
                    >
                      <p className="font-mono text-sm font-black text-[#f6d37a]">
                        {key}
                      </p>
                      <p className="font-mono text-sm text-blue-100">
                        {props.adminSummary?.answerBalance[key] ?? 0}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {props.adminSummary.levelCounts.map((level) => (
                  <div
                    className="border border-[#1c3f7d] bg-[#071a3d] px-3 py-2"
                    key={level.level}
                  >
                    <p className="font-mono text-xs font-black text-[#f6d37a]">
                      L{level.level} | {formatPrize(level.prizeAmount)}
                    </p>
                    <p className="mt-1 text-xs text-blue-100/65">
                      {level.activeCount} active / {level.totalCount} total
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold text-blue-50">
              Level
              <select
                className="mt-2 w-full border border-[#244b91] bg-[#020712] px-3 py-3 text-white outline-none transition focus:border-[#f6d37a]"
                onChange={(event) =>
                  props.onAdminLevelFilterChange(event.target.value)
                }
                value={props.adminLevelFilter}
              >
                <option value="all">All levels</option>
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (level) => (
                    <option key={level} value={String(level)}>
                      Level {level}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="block text-sm font-bold text-blue-50">
              Category
              <select
                className="mt-2 w-full border border-[#244b91] bg-[#020712] px-3 py-3 text-white outline-none transition focus:border-[#f6d37a]"
                onChange={(event) =>
                  props.onAdminCategoryFilterChange(event.target.value)
                }
                value={props.adminCategoryFilter}
              >
                <option value="">All categories</option>
                {questionCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-bold text-blue-50">
              Status
              <select
                className="mt-2 w-full border border-[#244b91] bg-[#020712] px-3 py-3 text-white outline-none transition focus:border-[#f6d37a]"
                onChange={(event) =>
                  props.onAdminActiveFilterChange(event.target.value)
                }
                value={props.adminActiveFilter}
              >
                <option value="all">All questions</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </label>

            <label className="block text-sm font-bold text-blue-50">
              Minimum reports
              <input
                className="mt-2 w-full border border-[#244b91] bg-[#020712] px-3 py-3 text-white outline-none transition focus:border-[#f6d37a]"
                min={0}
                onChange={(event) =>
                  props.onAdminMinReportsChange(Number(event.target.value) || 0)
                }
                type="number"
                value={props.adminMinReports}
              />
            </label>
          </div>

          <label className="mt-3 block text-sm font-bold text-blue-50">
            Search
            <input
              className="mt-2 w-full border border-[#244b91] bg-[#020712] px-3 py-3 text-white outline-none transition placeholder:text-blue-100/32 focus:border-[#f6d37a]"
              onChange={(event) => props.onAdminSearchChange(event.target.value)}
              placeholder="Find by question text"
              value={props.adminSearch}
            />
          </label>

          <div className="mt-3 grid gap-2">
            {props.reportedQuestions.length === 0 ? (
              <p className="text-sm text-blue-100/65">
                No admin questions loaded yet.
              </p>
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
                  <div className="mt-3 grid gap-2">
                    {[
                      ["A", question.answerA],
                      ["B", question.answerB],
                      ["C", question.answerC],
                      ["D", question.answerD],
                    ].map(([letter, answer]) => (
                      <p
                        className={`border px-3 py-2 text-xs font-bold ${
                          letter === question.correctAnswer
                            ? "border-[#6dff9f] bg-[#0b3523] text-[#c8ffd8]"
                            : "border-[#244b91] bg-[#020712] text-blue-100/70"
                        }`}
                        key={letter}
                      >
                        <span className="mr-2 font-mono text-[#f6d37a]">
                          {letter}
                        </span>
                        {answer}
                      </p>
                    ))}
                  </div>
                  <button
                    className={`mt-3 w-full border px-3 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-55 ${
                      question.active
                        ? "border-[#ff5e5e]/55 bg-[#320f18] text-red-50"
                        : "border-[#6dff9f]/65 bg-[#0b3523] text-[#c8ffd8]"
                    }`}
                    disabled={props.busy}
                    onClick={() =>
                      props.onToggleQuestionActive(question.id, !question.active)
                    }
                    type="button"
                  >
                    {question.active ? "Mark Inactive" : "Reactivate"}
                  </button>
                  {question.reports?.length ? (
                    <div className="mt-2 grid gap-1">
                      {question.reports.map((report) => (
                        <p
                          className="text-xs leading-5 text-blue-100/62"
                          key={`${question.id}-${report.accountId}-${report.reason}-${report.createdAt}`}
                        >
                          <span className="font-black text-[#f6d37a]">
                            {reportReasonLabels[report.reason]}
                          </span>{" "}
                          by {report.displayName}
                          {report.note ? `: ${report.note}` : ""}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
