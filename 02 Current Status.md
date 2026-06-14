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
