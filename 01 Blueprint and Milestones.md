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

### Milestone 2 - Real Accounts and Profiles - Completed 2026-06-15

- Add database-backed account creation.
- Store username, display name, and hashed 4-digit PIN.
- Login/logout.
- Username uniqueness and non-changeable usernames.
- Basic profile/stats page.

Implementation note:
- Account API routes, server-side PIN hashing, HTTP-only session cookies, login lockout tracking, and the profile/stats UI have been added.
- Supabase account tables, Vercel environment variables, and production account verification are complete.

### Milestone 3 - Private Rooms and Lobby Readiness - Completed 2026-06-15

- Create private rooms with room codes.
- Join room by code.
- Host selects player count from 2-10.
- Ready/unready system.
- Host transfer when host leaves.
- Prevent public room lists.

Implementation note:
- Private rooms are stored in Supabase tables `rooms` and `room_players`.
- Room actions run through server API routes so the Supabase secret key stays server-only.
- Room lobbies use simple polling for now; Supabase Realtime can replace or supplement this in the game-state milestone.
- Starting a room currently changes the room status to `in_game`; Fastest Finger First and gameplay are intentionally not built until later milestones.

### Milestone 4 - Question Database and Reporting - Completed 2026-06-15

- Add question schema and seed/import path.
- Add initial curated/generated question sample for testing.
- Add report-question flow.
- Add basic admin review placeholder or protected review screen.
- Plan safe generation/import process for all 1,200 questions.

Implementation note:
- Added `questions` and `question_reports` tables with RLS enabled.
- Added an `is_admin` account flag for protected admin review routes.
- Seeded 240 starter questions: 20 questions for each of the 12 prize levels.
- Public random question selection returns active questions only and does not expose the correct answer.
- Question reports save a reason and update `report_count`.
- Admin-only report listing shows reported questions and report counts.

### Milestone 5 - Realtime Game State - Completed 2026-06-15

- Start games only when room rules are satisfied.
- Server-recorded game state.
- Leave/disconnect handling.
- Prevent players from rejoining the same in-progress game after leaving.

Implementation note:
- Room statuses now support `waiting`, `starting`, `fastest_finger`, `hot_seat`, and `completed`.
- Start Game validates that the room is full and everyone is ready, locks membership, writes a `game_states` record, then moves the room from `waiting` to `starting` to `fastest_finger`.
- Realtime lobby sync uses a server-written `room_events` table published through Supabase Realtime. Browser clients subscribe to room events and refresh the room through the existing server API.
- A 30-second polling fallback remains as a backup if realtime is temporarily unavailable.
- A temporary logged-in debug panel shows room code, room status, game-state id, host, player count, eligible count, and realtime subscription status.
- Fastest Finger questions and gameplay are intentionally not built until Milestone 6.

### Milestone 6 - Fastest Finger First - Completed 2026-06-15

- 30-second ordering challenge.
- Server-recorded submission timing.
- Fastest correct player enters hot seat.
- Repeat after each completed hot-seat turn for remaining eligible players.

Implementation note:
- Added a separate Fastest Finger ordering-question bank with 100 active starter questions.
- Added server-owned Fastest Finger rounds and submissions.
- The browser receives prompt/items only; correct order stays server-side.
- Players see the same ordering question, arrange four draggable items, submit, and then wait for the other eligible players.
- Submission timing is recorded server-side in milliseconds from the server round start.
- If nobody submits the correct order, the server immediately creates a new Fastest Finger round.
- If multiple players are correct, fastest recorded submission wins; exact timing ties fall back to earliest submitted timestamp.
- When a winner is found, the room moves from `fastest_finger` to `hot_seat` and the winner is stored on `game_states`.
- Hot Seat gameplay itself is intentionally left for Milestone 7.

### Milestone 7 - Hot Seat Core Gameplay - Completed 2026-06-15

- 12-level money ladder.
- Safety nets at `$1,000` and `$32,000`.
- Correct/wrong reveal states.
- End each player after their turn.

Implementation note:
- Added server-owned Hot Seat turns in `hot_seat_turns`.
- After a Fastest Finger winner is chosen, the Hot Seat starts at level 1 for `$100`.
- The browser receives question text and answers only; the correct answer stays server-side until reveal.
- The hot-seat player selects an answer, confirms "final answer", then the UI waits briefly before showing correct or wrong.
- Correct answers advance to the next level.
- Wrong answers end that player's turn and apply the `$1,000` / `$32,000` safety-net rules.
- Completed players are removed from the next Fastest Finger round.
- When eligible players remain, the room returns to `fastest_finger`; when nobody remains, the room moves to `completed`.
- Lifelines are intentionally not included in this milestone.

### Milestone 8 - Lifelines - Completed 2026-06-16

- 50:50.
- Ask The Audience generated percentages.
- Pass queue behavior.

Implementation note:
- Added server-owned lifeline state to `hot_seat_turns`: `used_5050`, `used_audience`, `used_pass`, `removed_answers`, `audience_percentages`, and pass queue snapshots.
- 50:50 is decided server-side, keeps the correct answer plus one wrong answer, and blocks removed answers from being selected.
- Ask The Audience is generated server-side, totals 100%, becomes less reliable on higher levels, and respects answers already removed by 50:50.
- Pass is server-owned, consumes the player's Pass lifeline, moves that player to the back of the eligible queue, gives the next eligible player a new question at the same level, and keeps the passing player's progress/lifeline state for later.
- Lifeline changes emit room events so other players refresh into the same state.
- Correct answers and Fastest Finger correct order remain server-side before reveal.

### Milestone 9 - Final Results, Stats, and Question Reporting in Gameplay

- Ranking with tied places.
- Stats updates.
- In-game question reporting from the Hot Seat screen.
- End-results screen.

### Milestone 10 - Polish, Deployment, and Handover

- Premium responsive quiz-show UI.
- Dramatic timer animation.
- Browser testing of core flows.
- Production deployment verification.
- Plain-English handover.
