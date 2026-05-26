"use client";

import { FormEvent, useMemo, useState } from "react";

type Screen = "auth" | "profile" | "app";
type AuthMode = "signup" | "login";
type AppView = "dashboard" | "lobbies" | "rooms";
type Game = "Tic Tac Toe" | "Connect Four" | "Dots and Boxes";

type Room = {
  id: number;
  name: string;
  lobby: string;
  game: Game;
  isPrivate: boolean;
  inviteCode: string;
  status: "waiting";
};

const profilePics = [
  { id: "diamond", label: "Diamond", colors: "from-cyan-200 to-blue-600" },
  { id: "grass", label: "Grass", colors: "from-lime-300 to-emerald-700" },
  { id: "stone", label: "Stone", colors: "from-slate-200 to-slate-600" },
  { id: "wood", label: "Wood", colors: "from-amber-300 to-orange-800" },
  { id: "ore", label: "Ore", colors: "from-fuchsia-300 to-violet-700" },
  { id: "sun", label: "Sun", colors: "from-yellow-200 to-orange-500" },
];

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

const gameOptions: Record<Game, string> = {
  "Tic Tac Toe": "2 players",
  "Connect Four": "2 players",
  "Dots and Boxes": "2-4 players",
};

const initialRooms: Room[] = [
  {
    id: 1,
    name: "Starter Table",
    lobby: "Crystal Coast",
    game: "Tic Tac Toe",
    isPrivate: false,
    inviteCode: "TIC-204",
    status: "waiting",
  },
  {
    id: 2,
    name: "Puzzle Practice",
    lobby: "Sky Plaza",
    game: "Dots and Boxes",
    isPrivate: true,
    inviteCode: "DOT-442",
    status: "waiting",
  },
];

export function BoardVerseApp() {
  const [screen, setScreen] = useState<Screen>("auth");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [view, setView] = useState<AppView>("dashboard");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPic, setSelectedPic] = useState(profilePics[0].id);
  const [selectedLobby, setSelectedLobby] = useState(lobbies[0]);
  const [rooms, setRooms] = useState(initialRooms);
  const [activeRoomId, setActiveRoomId] = useState(initialRooms[0].id);
  const [roomName, setRoomName] = useState("Family Table");
  const [roomGame, setRoomGame] = useState<Game>("Tic Tac Toe");
  const [privateRoom, setPrivateRoom] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [notice, setNotice] = useState("");

  const displayName = username.trim() || "DemoPlayer";
  const selectedProfilePic = profilePics.find((pic) => pic.id === selectedPic);
  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];
  const formReady = username.trim().length >= 3 && password.length >= 4;

  const roomsInLobby = useMemo(
    () => rooms.filter((room) => room.lobby === selectedLobby),
    [rooms, selectedLobby],
  );

  function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formReady) {
      setNotice("Use a username with 3+ characters and a password with 4+ characters.");
      return;
    }

    setNotice("");
    setScreen("profile");
  }

  function completeProfile() {
    setScreen("app");
    setView("dashboard");
    setNotice("Profile setup complete.");
  }

  function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const code = `${roomGame.slice(0, 3).toUpperCase()}-${Math.floor(
      100 + Math.random() * 900,
    )}`;

    const room: Room = {
      id: Date.now(),
      name: roomName.trim() || "BoardVerse Room",
      lobby: selectedLobby,
      game: roomGame,
      isPrivate: privateRoom,
      inviteCode: code,
      status: "waiting",
    };

    setRooms([room, ...rooms]);
    setActiveRoomId(room.id);
    setView("rooms");
    setNotice(`Created room ${room.name}. Invite code: ${code}.`);
  }

  function joinByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const code = inviteCode.trim().toUpperCase();
    const room = rooms.find((item) => item.inviteCode === code);

    if (!room) {
      setNotice("No room found for that invite code in this local placeholder.");
      return;
    }

    setSelectedLobby(room.lobby);
    setActiveRoomId(room.id);
    setView("rooms");
    setNotice(`Joined ${room.name}.`);
  }

  function goToRoomsForLobby(lobby: string) {
    setSelectedLobby(lobby);
    const lobbyRoom = rooms.find((room) => room.lobby === lobby);
    if (lobbyRoom) {
      setActiveRoomId(lobbyRoom.id);
    }
    setView("rooms");
  }

  if (screen === "auth") {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#174a74_0,#07111f_42%,#050816_100%)] px-4 py-6 text-white">
        <section className="mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
          <div className="space-y-6">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">
              Online Board Games
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.96] sm:text-7xl">
              BoardVerse
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              A clickable MVP shell for accounts, profile setup, lobby browsing,
              and room setup.
            </p>
          </div>

          <form
            className="border-2 border-cyan-200/60 bg-slate-950/80 p-4 shadow-[10px_10px_0_rgba(139,92,246,0.65)]"
            onSubmit={submitAuth}
          >
            <div className="grid grid-cols-2 gap-2">
              {(["signup", "login"] as AuthMode[]).map((mode) => (
                <button
                  className={`border px-3 py-3 font-black capitalize ${
                    authMode === mode
                      ? "border-cyan-200 bg-cyan-300 text-slate-950"
                      : "border-white/15 bg-white/5"
                  }`}
                  key={mode}
                  onClick={() => {
                    setAuthMode(mode);
                    setNotice("");
                  }}
                  type="button"
                >
                  {mode}
                </button>
              ))}
            </div>

            <h2 className="mt-5 text-2xl font-black">
              {authMode === "signup" ? "Create Account" : "Log In"}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              This is local placeholder auth until Supabase is connected.
            </p>

            <label className="mt-5 block text-sm font-bold" htmlFor="username">
              Username
            </label>
            <input
              className="mt-2 w-full border border-cyan-200/40 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-200"
              id="username"
              maxLength={18}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Minimum 3 characters"
              value={username}
            />

            <label className="mt-4 block text-sm font-bold" htmlFor="password">
              Password
            </label>
            <input
              className="mt-2 w-full border border-cyan-200/40 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-200"
              id="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 4 characters"
              type="password"
              value={password}
            />

            {notice && <p className="mt-3 text-sm text-yellow-200">{notice}</p>}

            <button
              className="mt-5 w-full bg-cyan-300 px-4 py-3 font-black text-slate-950 shadow-[5px_5px_0_#6d28d9] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!formReady}
              type="submit"
            >
              Continue to Profile Setup
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (screen === "profile") {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white">
        <section className="mx-auto max-w-4xl">
          <button
            className="border border-white/15 px-3 py-2 text-sm font-bold"
            onClick={() => setScreen("auth")}
            type="button"
          >
            Back
          </button>
          <div className="mt-5 border-2 border-cyan-200/60 bg-slate-950/80 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-200">
              First-time profile setup
            </p>
            <h1 className="mt-2 text-3xl font-black">Choose a profile pic</h1>
            <p className="mt-2 text-slate-300">
              Preset block-style profile pics only. No uploads in the MVP.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {profilePics.map((pic) => (
                <button
                  className={`border-2 p-4 text-left ${
                    selectedPic === pic.id
                      ? "border-yellow-200 bg-yellow-200/10"
                      : "border-white/15 bg-white/5"
                  }`}
                  key={pic.id}
                  onClick={() => setSelectedPic(pic.id)}
                  type="button"
                >
                  <span
                    className={`mb-3 block h-12 w-12 bg-gradient-to-br ${pic.colors}`}
                  />
                  <span className="font-black">{pic.label}</span>
                </button>
              ))}
            </div>
            <button
              className="mt-5 bg-cyan-300 px-4 py-3 font-black text-slate-950 shadow-[5px_5px_0_#6d28d9]"
              onClick={completeProfile}
              type="button"
            >
              Finish Profile Setup
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <header className="border-b border-cyan-200/15 bg-slate-950 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">
              Online Board Games
            </p>
            <h1 className="text-xl font-black">BoardVerse</h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`hidden h-9 w-9 bg-gradient-to-br sm:block ${selectedProfilePic?.colors}`}
            />
            <span className="font-bold">{displayName}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[220px_1fr]">
        <aside className="grid gap-2 self-start lg:sticky lg:top-4">
          {(["dashboard", "lobbies", "rooms"] as AppView[]).map((item) => (
            <button
              className={`border px-4 py-3 text-left font-black capitalize ${
                view === item
                  ? "border-cyan-200 bg-cyan-300 text-slate-950"
                  : "border-white/15 bg-white/5"
              }`}
              key={item}
              onClick={() => {
                setView(item);
                setNotice("");
              }}
              type="button"
            >
              {item}
            </button>
          ))}
          <button
            className="cursor-not-allowed border border-white/15 bg-white/5 px-4 py-3 text-left font-black text-slate-500"
            disabled
            title="Friends need the backend account system first."
            type="button"
          >
            Friends - backend needed
          </button>
          <button
            className="cursor-not-allowed border border-white/15 bg-white/5 px-4 py-3 text-left font-black text-slate-500"
            disabled
            title="Admin tools need real reports and roles first."
            type="button"
          >
            Admin - backend needed
          </button>
        </aside>

        <section className="min-w-0">
          {notice && (
            <div className="mb-4 border border-yellow-200/50 bg-yellow-200/10 p-3 text-sm text-yellow-100">
              {notice}
            </div>
          )}

          {view === "dashboard" && (
            <div className="grid gap-4">
              <section className="border-2 border-cyan-200/50 bg-slate-950/70 p-4">
                <p className="text-sm text-cyan-200">Dashboard</p>
                <h2 className="text-3xl font-black">Welcome, {displayName}</h2>
                <p className="mt-2 text-slate-300">
                  Your basic app shell is clickable. Choose a lobby or create a
                  room to test the foundation flow.
                </p>
              </section>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  className="border border-white/15 bg-white/8 p-4 text-left"
                  onClick={() => setView("lobbies")}
                  type="button"
                >
                  <h3 className="text-lg font-black">Choose Lobby</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    Browse 10 visual areas.
                  </p>
                </button>
                <button
                  className="border border-white/15 bg-white/8 p-4 text-left"
                  onClick={() => setView("rooms")}
                  type="button"
                >
                  <h3 className="text-lg font-black">Create Room</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    Make a local placeholder room.
                  </p>
                </button>
                <button
                  className="cursor-not-allowed border border-white/15 bg-white/5 p-4 text-left text-slate-500"
                  disabled
                  title="Stats need real saved match results first."
                  type="button"
                >
                  <h3 className="text-lg font-black">Stats</h3>
                  <p className="mt-1 text-sm">Needs saved matches.</p>
                </button>
              </div>
            </div>
          )}

          {view === "lobbies" && (
            <div className="grid gap-4">
              <div>
                <h2 className="text-3xl font-black">Lobby Areas</h2>
                <p className="mt-2 text-slate-300">
                  Selected lobby: <span className="font-black">{selectedLobby}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {lobbies.map((lobby, index) => (
                  <button
                    className={`min-h-28 border p-3 text-left ${
                      selectedLobby === lobby
                        ? "border-yellow-200 bg-yellow-200/10"
                        : "border-white/15 bg-white/8"
                    }`}
                    key={lobby}
                    onClick={() => setSelectedLobby(lobby)}
                    type="button"
                  >
                    <span className="mb-4 block h-5 w-5 bg-cyan-300 shadow-[4px_4px_0_#8b5cf6]" />
                    <span className="block font-black">{lobby}</span>
                    <span className="font-mono text-xs text-slate-300">
                      Zone {String(index + 1).padStart(2, "0")}
                    </span>
                  </button>
                ))}
              </div>
              <button
                className="w-full bg-cyan-300 px-4 py-3 font-black text-slate-950 sm:w-fit"
                onClick={() => goToRoomsForLobby(selectedLobby)}
                type="button"
              >
                See Rooms In Selected Lobby
              </button>
            </div>
          )}

          {view === "rooms" && (
            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <div className="grid gap-4">
                <div>
                  <h2 className="text-3xl font-black">Rooms</h2>
                  <p className="mt-2 text-slate-300">
                    Showing local placeholder rooms for {selectedLobby}.
                  </p>
                </div>
                <div className="grid gap-3">
                  {(roomsInLobby.length > 0 ? roomsInLobby : rooms).map((room) => (
                    <button
                      className={`border p-4 text-left ${
                        activeRoom.id === room.id
                          ? "border-cyan-200 bg-cyan-200/10"
                          : "border-white/15 bg-white/8"
                      }`}
                      key={room.id}
                      onClick={() => {
                        setActiveRoomId(room.id);
                        setSelectedLobby(room.lobby);
                        setNotice(`Opened ${room.name}.`);
                      }}
                      type="button"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-black">{room.name}</h3>
                          <p className="text-sm text-slate-300">
                            {room.game} | {gameOptions[room.game]} | {room.lobby}
                          </p>
                        </div>
                        <span className="border border-cyan-200/40 px-2 py-1 font-mono text-xs uppercase text-cyan-100">
                          {room.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">
                        {room.isPrivate ? "Private" : "Public"} | Invite code:{" "}
                        {room.inviteCode}
                      </p>
                    </button>
                  ))}
                </div>

                <form
                  className="border border-white/15 bg-slate-950/70 p-4"
                  onSubmit={createRoom}
                >
                  <h3 className="text-xl font-black">Create Room</h3>
                  <label className="mt-3 block text-sm font-bold" htmlFor="roomName">
                    Room name
                  </label>
                  <input
                    className="mt-2 w-full border border-white/15 bg-slate-900 px-3 py-3"
                    id="roomName"
                    onChange={(event) => setRoomName(event.target.value)}
                    value={roomName}
                  />
                  <label className="mt-3 block text-sm font-bold" htmlFor="roomGame">
                    Game
                  </label>
                  <select
                    className="mt-2 w-full border border-white/15 bg-slate-900 px-3 py-3"
                    id="roomGame"
                    onChange={(event) => setRoomGame(event.target.value as Game)}
                    value={roomGame}
                  >
                    {Object.keys(gameOptions).map((game) => (
                      <option key={game}>{game}</option>
                    ))}
                  </select>
                  <label className="mt-3 flex items-center gap-2 text-sm font-bold">
                    <input
                      checked={privateRoom}
                      onChange={(event) => setPrivateRoom(event.target.checked)}
                      type="checkbox"
                    />
                    Private room with invite code
                  </label>
                  <button
                    className="mt-4 bg-cyan-300 px-4 py-3 font-black text-slate-950"
                    type="submit"
                  >
                    Create Room
                  </button>
                </form>
              </div>

              <aside className="grid gap-4 self-start border-2 border-cyan-200/50 bg-slate-950/70 p-4">
                <div>
                  <p className="text-sm text-cyan-200">Current room</p>
                  <h3 className="text-2xl font-black">{activeRoom.name}</h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {activeRoom.game} in {activeRoom.lobby}
                  </p>
                </div>
                <form className="grid gap-2" onSubmit={joinByCode}>
                  <label className="text-sm font-bold" htmlFor="inviteCode">
                    Join by invite code
                  </label>
                  <input
                    className="border border-white/15 bg-slate-900 px-3 py-3 uppercase"
                    id="inviteCode"
                    onChange={(event) => setInviteCode(event.target.value)}
                    placeholder="Example: TIC-204"
                    value={inviteCode}
                  />
                  <button className="bg-cyan-300 px-4 py-3 font-black text-slate-950">
                    Join Room
                  </button>
                </form>
                <div className="grid gap-2">
                  <button
                    className="cursor-not-allowed border border-white/15 bg-white/5 px-4 py-3 text-left font-black text-slate-500"
                    disabled
                    title="Starting matches needs the real game engine."
                    type="button"
                  >
                    Start Match - needs game engine
                  </button>
                  <button
                    className="cursor-not-allowed border border-white/15 bg-white/5 px-4 py-3 text-left font-black text-slate-500"
                    disabled
                    title="Friend invites need real accounts first."
                    type="button"
                  >
                    Invite Friend - needs accounts
                  </button>
                  <button
                    className="cursor-not-allowed border border-white/15 bg-white/5 px-4 py-3 text-left font-black text-slate-500"
                    disabled
                    title="Room chat needs realtime backend storage."
                    type="button"
                  >
                    Room Chat - needs realtime
                  </button>
                </div>
              </aside>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
