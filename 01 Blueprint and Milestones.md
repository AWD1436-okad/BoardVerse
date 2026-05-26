# Blueprint and Milestones

## Recommended Stack

- Next.js App Router with TypeScript.
- Tailwind CSS for responsive UI.
- Supabase Postgres for app data.
- Supabase Auth-backed account records for username/password sign-in.
- Supabase Realtime or a simple realtime channel layer for rooms, chat, and turns.
- Vercel for hosting and production deployment.

## Architecture Blueprint

The app will use a protected account flow, a realtime room system, and isolated board-game rules engines.

Main data areas:
- Profiles and preset profile pics.
- Friends and friend requests.
- Lobby areas and rooms.
- Room members, spectators, bots, and invites.
- Player chat and spectator chat.
- Reports, moderation logs, mutes, bans, and admin roles.
- Matches, game states, match results, game stats, XP, levels, and fake money rewards.

Security requirements:
- Row Level Security must be enabled on exposed Supabase tables.
- Admin privileges must be stored as trusted server-side authorization data, not editable user metadata.
- Service-role secrets must never be exposed to browser code.
- User uploads are out of scope for the MVP.

## Milestones

1. Project setup and memory files.
2. Auth, profiles, and dashboard.
3. Lobby areas, rooms, and friends.
4. Chat, reports, moderation, and admin.
5. Realtime game engine.
6. First 3 games.
7. Polish, testing, and deployment.

## MVP Game Rules

- Tic Tac Toe: exactly 2 players.
- Connect Four: exactly 2 players.
- Dots and Boxes: 2 to 4 players.

Rooms must only allow valid player counts for the selected game.
