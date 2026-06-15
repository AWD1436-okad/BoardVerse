# Current Status

## 2026-06-14 - Project Reset Decision

The project is an existing Next.js app previously built for PlayGrid, an online board-game concept. The new real product is Final Answer, and the old PlayGrid product can be erased and replaced.

What exists now:
- Next.js App Router project with TypeScript, Tailwind CSS, ESLint, npm, and Supabase packages installed.
- One app route: `/`.
- One large client component for the old PlayGrid placeholder app.
- Browser-local placeholder accounts and rooms from the old product.
- Git repository and GitHub remote are configured.
- Vercel project is linked as `boardverse`.
- `https://playsgrid.org` serves the current production app.
- `https://www.playsgrid.org` redirects to `https://playsgrid.org/`.

What is not real yet:
- Final Answer UI.
- Real database-backed accounts.
- PIN hashing.
- Rooms stored in a database.
- Realtime multiplayer.
- Fastest Finger First.
- Hot seat game logic.
- Lifelines.
- Question database.
- Question reports.
- Stats.

Current recommendation:
- Keep the Next.js/Vercel/GitHub/domain foundation.
- Replace old PlayGrid code with Final Answer in milestones.
- Start with Milestone 1: rebuild foundation, metadata, memory files, and public starter shell.

## 2026-06-14 - Milestone 1 Completed

Milestone 1 has replaced the public PlayGrid placeholder with the Final Answer foundation.

What works now:
- The public `/` route renders the Final Answer landing page.
- Public metadata title and description use Final Answer.
- Original Final Answer branding is in place with an `FA` mark.
- The visual style uses dark navy/black backgrounds, deep blue panels, gold highlights, orange selected-answer styling, and a dramatic timer flare preview.
- Main placeholder buttons are visible and clickable:
  - Create Account.
  - Log In.
  - Create Room.
  - Join Room.
- Placeholder button clicks explain which future milestone will make each action real.
- The old browser-local PlayGrid board-game UI is no longer used by the public route.

Still not real yet:
- Database-backed accounts.
- Login with hashed 4-digit PIN.
- Private rooms and room codes.
- Realtime gameplay.
- Question database and reporting.
- Stats.

Next best milestone:
- Milestone 2: real accounts and profiles.

## 2026-06-14 - Milestone 2 Account Code Added

Milestone 2 account implementation has been added to the codebase, but production account storage is not active until Supabase is configured.

What works in code now:
- Create Account opens a real account form.
- Log In opens a real login form.
- Account API routes exist for signup, login, logout, session check, and display-name update.
- 4-digit PINs are validated.
- PINs are hashed server-side with Node crypto `scrypt` before storage.
- Sessions use an HTTP-only cookie and a hashed session token stored in the database.
- Failed login attempts are tracked by username in the database design.
- After 5 failed attempts, that username is locked for 10 minutes.
- Profile/stats panel exists and shows default stats.
- Display name can be edited after login.
- Create Room and Join Room remain clear Milestone 3 placeholders.

Current status:
- Supabase account tables are created in project `chhdhlmnlocxwgqdqfip`.
- Required production Vercel variables are configured:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
- Real production account signup, duplicate username blocking, login, logout, session persistence, display-name update, profile/stats loading, wrong-PIN rejection, and lockout behavior have been verified.
- No sensitive server-only account data was found in public browser assets during verification.

Next milestone:
- Milestone 3: private rooms and lobby readiness is approved to begin.

## 2026-06-15 - Milestone 3 Private Rooms Completed

Milestone 3 has added real private rooms on top of the production account system.

What works now:
- Logged-in users can create private rooms.
- Logged-in users can join private rooms by a 6-character room code.
- There is no public room list.
- Hosts choose a player count from 2 to 10.
- The room lobby shows the room code, room status, selected player count, active player count, display names, usernames, ready state, and host badge.
- Players can switch between Ready and Not Ready.
- Start Game is blocked until the room has exactly the selected number of active players and all active players are ready.
- When the room is valid, the host can start it and the room moves to `in_game`.
- If the host leaves before the game starts, the next remaining active player becomes host.
- A player who leaves before the game starts can rejoin by code.
- A player who leaves after the room is `in_game` is marked as having left during the game and cannot rejoin that game.
- Clear error messages exist for must be logged in, invalid room code, room not found, room full, game already started, and start-blocked states.

What is still not built:
- Chat is intentionally not included in Milestone 3.
- Fastest Finger First is not started yet.
- Hot-seat gameplay, lifelines, question database, question reports, final rankings, and stats updates are still pending.
- Room updates currently use simple polling rather than a full realtime channel.

Next milestone:
- Milestone 4: question database and report-question foundation.

## 2026-06-15 - Milestone 4 Question Database Completed

Milestone 4 has added the question database and report-question foundation.

What works now:
- Supabase has `questions` and `question_reports` tables.
- Accounts now support an `is_admin` flag for protected admin routes.
- The starter database contains 240 active questions: 20 per level from level 1 through level 12.
- Each question stores text, four answers, correct answer, level, prize amount, category, active status, report count, and creation date.
- Random question selection by level works through `/api/questions/random`.
- Random question responses do not expose the correct answer to the browser.
- Inactive questions are skipped.
- Logged-in users can report questions for Wrong answer, Ambiguous wording, Typo, or Other.
- Reporting a question saves a report and increments the question report count.
- Admin-only report review exists at `/api/admin/questions/reports`.
- A small logged-in Question Bank Test panel exists so the question/report system can be tested before gameplay is built.

What is still not built:
- Fastest Finger First has not started.
- Hot-seat gameplay has not started.
- Lifelines have not started.
- The full 1,200-question set has not been generated or reviewed yet.
- Admin question editing is not built yet.

Next milestone:
- Milestone 5 or 6 should connect the existing rooms to game state and Fastest Finger First. The safest next step is to design the server-recorded game state before adding the timed Fastest Finger UI.
