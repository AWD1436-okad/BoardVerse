import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const sessionCookieName = "final_answer_session";
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 14;
export const lockoutMinutes = 10;
export const maxFailedAttempts = 5;

const pinKeyLength = 64;

export type AccountStats = {
  fastestFingerWins: number;
  gamesPlayed: number;
  highestPrizeWon: number;
  questionsAnsweredCorrectly: number;
  ties: number;
  totalMoneyWon: number;
  wins: number;
};

export type PublicAccount = {
  createdAt: string;
  displayName: string;
  id: string;
  isAdmin: boolean;
  stats: AccountStats;
  username: string;
};

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string) {
  const normalized = normalizeUsername(username);

  if (!/^[a-z0-9_]{3,20}$/.test(normalized)) {
    return {
      ok: false,
      message:
        "Username must be 3-20 characters using letters, numbers, or underscores.",
    } as const;
  }

  return { ok: true, normalized } as const;
}

export function validateDisplayName(displayName: string) {
  const cleaned = displayName.trim();

  if (cleaned.length < 1 || cleaned.length > 24) {
    return {
      ok: false,
      message: "Display name must be 1-24 characters.",
    } as const;
  }

  return { ok: true, cleaned } as const;
}

export function validatePin(pin: string) {
  if (!/^\d{4}$/.test(pin)) {
    return {
      ok: false,
      message: "PIN must be exactly 4 digits.",
    } as const;
  }

  return { ok: true } as const;
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, pinKeyLength).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPin(pin: string, storedHash: string) {
  const [algorithm, salt, hash] = storedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(pin, salt, expected.length);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return scryptSync(token, "final-answer-session-v1", 32).toString("hex");
}

export function defaultStats(): AccountStats {
  return {
    fastestFingerWins: 0,
    gamesPlayed: 0,
    highestPrizeWon: 0,
    questionsAnsweredCorrectly: 0,
    ties: 0,
    totalMoneyWon: 0,
    wins: 0,
  };
}
