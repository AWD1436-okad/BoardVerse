export default function Home() {
  const lobbies = [
    "Crystal Coast",
    "Teal Towers",
    "Moon Mine",
    "Dice Harbor",
    "Puzzle Park",
    "Neon Grove",
    "Block Bay",
    "Star Quarry",
    "Token Trail",
    "Sky Plaza",
  ];

  const milestones = [
    "Accounts and profile pics",
    "Lobbies, rooms, and friends",
    "Chat, reports, and admin tools",
    "Realtime turns, bots, and results",
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#174a74_0,#07111f_42%,#050816_100%)] text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between border-b border-cyan-200/15 pb-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200">
              Online Board Games
            </p>
            <h1 className="text-2xl font-black tracking-wide text-white sm:text-3xl">
              BoardVerse
            </h1>
          </div>
          <div className="grid h-12 w-12 place-items-center border-2 border-cyan-200 bg-cyan-300 text-xl font-black text-slate-950 shadow-[6px_6px_0_#6d28d9]">
            BV
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:py-12">
          <div className="space-y-7">
            <div className="inline-flex border border-cyan-200/30 bg-cyan-200/10 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">
              Milestone 1 foundation live locally
            </div>
            <div className="space-y-4">
              <h2 className="max-w-3xl text-5xl font-black leading-[0.96] tracking-normal sm:text-6xl lg:text-7xl">
                Build rooms. Take turns. Play together.
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
                BoardVerse is being set up as a kid-friendly browser hub for
                casual realtime board games with visual lobbies, private rooms,
                friends, chat safety, bots, and match rewards.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:max-w-xl sm:grid-cols-4">
              {[
                ["10", "Lobby areas"],
                ["3", "MVP games"],
                ["20s", "Turn timer"],
                ["100%", "Casual"],
              ].map(([value, label]) => (
                <div
                  className="border border-white/15 bg-white/8 p-4 shadow-[4px_4px_0_rgba(45,212,191,0.35)]"
                  key={label}
                >
                  <div className="font-mono text-2xl font-black text-yellow-200">
                    {value}
                  </div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-300">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <section className="border-2 border-cyan-200/60 bg-slate-950/60 p-4 shadow-[10px_10px_0_rgba(139,92,246,0.65)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-black">Lobby Map</h3>
                <span className="font-mono text-xs text-cyan-200">
                  10 visual zones
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {lobbies.map((lobby, index) => (
                  <div
                    className="min-h-24 border border-white/15 bg-gradient-to-br from-cyan-300/20 via-blue-500/15 to-violet-500/25 p-3"
                    key={lobby}
                  >
                    <div className="mb-4 h-5 w-5 bg-yellow-200 shadow-[4px_4px_0_#22d3ee]" />
                    <p className="text-sm font-extrabold leading-tight">
                      {lobby}
                    </p>
                    <p className="mt-2 font-mono text-[10px] text-slate-300">
                      Zone {String(index + 1).padStart(2, "0")}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              {milestones.map((milestone, index) => (
                <div
                  className="flex items-center gap-3 border border-white/15 bg-white/8 p-4"
                  key={milestone}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center bg-cyan-300 font-mono font-black text-slate-950">
                    {index + 2}
                  </span>
                  <p className="text-sm font-bold text-slate-100">
                    {milestone}
                  </p>
                </div>
              ))}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
