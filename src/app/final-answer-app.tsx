"use client";

import { FormEvent, useEffect, useState } from "react";

type Panel = "signup" | "login" | "create-room" | "join-room";

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
  stats: AccountStats;
  username: string;
};

type ApiResponse = {
  account?: Account | null;
  code?: string;
  configured?: boolean;
  message?: string;
  missing?: string[];
  ok: boolean;
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

function formatStat(key: keyof AccountStats, value: number) {
  if (key === "highestPrizeWon" || key === "totalMoneyWon") {
    return `$${value.toLocaleString()}`;
  }

  return value.toLocaleString();
}

function validPin(pin: string) {
  return /^\d{4}$/.test(pin);
}

export function FinalAnswerApp() {
  const [activePanel, setActivePanel] = useState<Panel>("signup");
  const [account, setAccount] = useState<Account | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [missingSetup, setMissingSetup] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [signupUsername, setSignupUsername] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [signupPin, setSignupPin] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [displayNameDraft, setDisplayNameDraft] = useState("");

  const stats = account?.stats ?? emptyStats;
  const joinedDate = account?.createdAt
    ? new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(account.createdAt))
    : "";

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
                ["create-room", "Create Room", "Milestone 3"],
                ["join-room", "Join Room", "Milestone 3"],
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
            aria-label="Account and game preview"
            className="relative border border-[#244b91] bg-[#040b19]/90 p-4 shadow-[14px_14px_0_rgba(214,161,50,0.18),0_0_60px_rgba(21,58,122,0.3)] sm:p-5"
            id="account-panel"
          >
            <div className="absolute -inset-px -z-10 bg-gradient-to-br from-[#f6d37a]/40 via-transparent to-[#2457b7]/50 blur-xl" />
            {account ? (
              <ProfilePanel
                account={account}
                busy={busy}
                displayNameDraft={displayNameDraft}
                onDisplayNameChange={setDisplayNameDraft}
                onSubmitDisplayName={submitDisplayName}
                stats={stats}
                joinedDate={joinedDate}
              />
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
  if (props.activePanel === "create-room" || props.activePanel === "join-room") {
    return (
      <div className="border border-[#244b91] bg-[#061a3e] p-4">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
          Milestone 3
        </p>
        <h2 className="mt-3 text-2xl font-black">
          {props.activePanel === "create-room" ? "Create Room" : "Join Room"}
        </h2>
        <p className="mt-3 text-sm leading-6 text-blue-100/80">
          Private room codes, player counts, and ready states come after real
          accounts. This button is intentionally held until Milestone 3.
        </p>
      </div>
    );
  }

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
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={props.onSubmitDisplayName}>
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
