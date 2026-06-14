"use client";

import { useState } from "react";

type ActionKey = "account" | "login" | "create-room" | "join-room";

const actions: Array<{
  key: ActionKey;
  label: string;
  eyebrow: string;
  detail: string;
}> = [
  {
    key: "account",
    label: "Create Account",
    eyebrow: "Milestone 2",
    detail:
      "Username, display name, and secure 4-digit PIN storage are planned next.",
  },
  {
    key: "login",
    label: "Log In",
    eyebrow: "Milestone 2",
    detail:
      "Login will unlock profile stats and private room access after accounts are connected.",
  },
  {
    key: "create-room",
    label: "Create Room",
    eyebrow: "Milestone 3",
    detail:
      "Hosts will create private rooms, choose player count, and share a room code.",
  },
  {
    key: "join-room",
    label: "Join Room",
    eyebrow: "Milestone 3",
    detail:
      "Players will join by private room code. No public room list will be added.",
  },
];

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

export function FinalAnswerApp() {
  const [selectedAction, setSelectedAction] = useState(actions[0]);

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
          <a
            className="hidden border border-[#f6d37a]/45 bg-[#0d2450]/80 px-4 py-3 text-sm font-black text-[#f6d37a] shadow-[0_0_22px_rgba(34,76,151,0.35)] transition hover:border-[#f6d37a] hover:bg-[#12316a] sm:inline-flex"
            href="#milestone-preview"
          >
            View MVP Plan
          </a>
        </header>

        <div
          className="mx-auto grid max-w-7xl items-center gap-8 pb-10 pt-10 lg:min-h-[calc(100vh-92px)] lg:grid-cols-[1.08fr_0.92fr] lg:pt-0"
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
              {actions.map((action) => (
                <button
                  className={`group border px-5 py-4 text-left transition ${
                    selectedAction.key === action.key
                      ? "border-[#f6d37a] bg-[#f6d37a] text-[#081226] shadow-[0_0_32px_rgba(246,211,122,0.25)]"
                      : "border-[#244b91] bg-[#071a3d]/82 text-white hover:border-[#f6d37a]/80 hover:bg-[#0d2c66]"
                  }`}
                  key={action.key}
                  onClick={() => setSelectedAction(action)}
                  type="button"
                >
                  <span className="block text-[11px] font-black uppercase tracking-[0.2em] opacity-75">
                    {action.eyebrow}
                  </span>
                  <span className="mt-1 block text-xl font-black">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 border border-[#f6d37a]/30 bg-[#061733]/88 p-4 shadow-[0_0_38px_rgba(3,8,17,0.45)]">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
                Placeholder action
              </p>
              <p className="mt-2 text-sm leading-6 text-blue-100/82">
                <span className="font-black text-white">
                  {selectedAction.label}:
                </span>{" "}
                {selectedAction.detail}
              </p>
            </div>
          </section>

          <section
            aria-label="Game preview"
            className="relative border border-[#244b91] bg-[#040b19]/90 p-4 shadow-[14px_14px_0_rgba(214,161,50,0.18),0_0_60px_rgba(21,58,122,0.3)] sm:p-5"
          >
            <div className="absolute -inset-px -z-10 bg-gradient-to-br from-[#f6d37a]/40 via-transparent to-[#2457b7]/50 blur-xl" />
            <div className="grid gap-4 lg:grid-cols-[1fr_154px]">
              <div className="grid gap-4">
                <div className="border border-[#244b91] bg-[#061a3e] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f6d37a]">
                      Fastest Finger
                    </p>
                    <span className="font-mono text-sm font-black text-white">
                      30
                    </span>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden border border-[#f6d37a]/40 bg-[#020712]">
                    <div className="timer-flare h-full w-full" />
                  </div>
                  <p className="mt-4 text-sm font-bold text-blue-100/80">
                    Arrange the answers in the correct order before the flare
                    reaches the end.
                  </p>
                </div>

                <div className="border border-[#244b91] bg-[#061a3e] p-4">
                  <p className="text-sm font-black text-[#f6d37a]">
                    Which answer locks in the hot seat?
                  </p>
                  <div className="mt-4 grid gap-3">
                    {["A  Blue", "B  Gold", "C  Orange", "D  Green"].map(
                      (answer, index) => (
                        <div
                          className={`border px-4 py-3 text-sm font-black ${
                            index === 2
                              ? "border-[#ff9f2f] bg-[#9a4c10] text-white"
                              : "border-[#2457b7] bg-[#0b2d69] text-blue-50"
                          }`}
                          key={answer}
                        >
                          {answer}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>

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
            </div>
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
