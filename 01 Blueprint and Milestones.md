# Final Answer Blueprint and Milestones

## Current Recommendation

Keep the existing Next.js/Vercel project shell, but replace the old PlayGrid app code with Final Answer. This is safer than a brand-new folder because the repo, GitHub remote, Vercel project, and `playsgrid.org` domain are already connected and working.

## Recommended Stack

- Next.js App Router with TypeScript for the browser app and server routes.
- Tailwind CSS for responsive UI.
- Supabase Postgres for accounts, rooms, game state, questions, reports, and stats.
- Supabase Realtime or server-backed polling/realtime channels for room updates.
- Vercel hosting on `playsgrid.org`.
- Server-side PIN hashing with a standard password-hashing library before storing account credentials.

## Architecture Blueprint

Main app areas:
- Landing/auth.
- Account creation and login.
- Profile and stats.
- Private room creation and joining by code.
- Lobby readiness and host transfer.
- Fastest Finger First.
- Hot seat question flow.
- Lifelines: 50:50, Ask The Audience, Pass.
- Results and rankings.
- Question reporting.
- Basic admin/review tools for reported questions.

Core database tables planned:
- `accounts`
- `rooms`
- `room_players`
- `games`
- `game_turns`
- `questions`
- `question_reports`
- `player_question_history`
- `player_stats`

Security requirements:
- PINs must be hashed server-side.
- Service-role secrets must never be exposed to browser code.
- Database access should use Row Level Security where browser clients can read/write directly.
- Game timing and Fastest Finger results should be recorded server-side where possible.

## Milestone Plan

### Milestone 1 - Rebuild Foundation and Memory Files - Completed 2026-06-14

- Replace old PlayGrid memory with Final Answer requirements.
- Replace public metadata and starter UI branding.
- Remove old board-game-specific UI/state.
- Add a polished Final Answer landing/auth shell.
- Keep deployment domain working.

### Milestone 2 - Real Accounts and Profiles - Code Complete, Awaiting Supabase Setup

- Add database-backed account creation.
- Store username, display name, and hashed 4-digit PIN.
- Login/logout.
- Username uniqueness and non-changeable usernames.
- Basic profile/stats page.

Implementation note:
- Account API routes, server-side PIN hashing, HTTP-only session cookies, login lockout tracking, and the profile/stats UI have been added.
- Real account persistence requires the Supabase SQL schema and environment variables listed in `05 Deployment and Handover.md`.

### Milestone 3 - Private Rooms and Lobby Readiness

- Create private rooms with room codes.
- Join room by code.
- Host selects player count from 2-10.
- Ready/unready system.
- Host transfer when host leaves.
- Prevent public room lists.

### Milestone 4 - Question Database and Reporting

- Add question schema and seed/import path.
- Add initial curated/generated question sample for testing.
- Add report-question flow.
- Add basic admin review placeholder or protected review screen.
- Plan safe generation/import process for all 1,200 questions.

### Milestone 5 - Realtime Game State

- Start games only when room rules are satisfied.
- Server-recorded game state.
- Leave/disconnect handling.
- Prevent players from rejoining the same in-progress game after leaving.

### Milestone 6 - Fastest Finger First

- 30-second ordering challenge.
- Server-recorded submission timing.
- Fastest correct player enters hot seat.
- Repeat after each completed hot-seat turn for remaining eligible players.

### Milestone 7 - Hot Seat Game and Lifelines

- 12-level money ladder.
- Safety nets at `$1,000` and `$32,000`.
- Correct/wrong reveal states.
- 50:50.
- Ask The Audience generated percentages.
- Pass queue behavior.
- End each player after their turn.

### Milestone 8 - Results, Stats, Polish, Deployment

- Ranking with tied places.
- Stats updates.
- Premium responsive quiz-show UI.
- Dramatic timer animation.
- Browser testing of core flows.
- Production deployment verification.
- Plain-English handover.
