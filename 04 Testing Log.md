# Testing Log

## 2026-06-14 - Initial Final Answer Inspection

Checks run:
- Inspected project files and package setup.
- Inspected existing project memory files.
- Inspected Vercel project link.
- Checked Vercel production deployment for `playsgrid.org`.
- Checked Vercel environment variables.
- Checked HTTPS response for `https://playsgrid.org`.
- Checked `https://www.playsgrid.org` redirect.

Results:
- Existing stack is Next.js 16, React 19, TypeScript, Tailwind CSS, ESLint, npm, Supabase packages, and Vercel.
- Production deployment is Ready.
- `https://playsgrid.org` returns HTTP 200.
- `https://www.playsgrid.org` returns 308 redirect to `https://playsgrid.org/`.
- Vercel environment variable list is empty.
- Current live app is still the old PlayGrid placeholder and must be replaced.

Follow-up checks after memory-file update:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

## 2026-06-14 - Milestone 1 Final Answer Foundation

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Local browser tests at `http://127.0.0.1:3000`:
- Page title is `Final Answer | Private Quiz Game`.
- Final Answer landing page renders.
- Create Account button is clickable and shows its Milestone 2 placeholder explanation.
- Log In button is clickable and shows its Milestone 2 placeholder explanation.
- Create Room button is clickable and shows its Milestone 3 placeholder explanation.
- Join Room button is clickable and shows its Milestone 3 placeholder explanation.
- Fastest Finger preview and prize ladder are visible.
- Desktop browser console errors: none found.
- Mobile viewport check at 390 x 844 has no horizontal overflow.

Known limits:
- Buttons are intentional placeholders until accounts and rooms are implemented.
- No Supabase setup was added in this milestone.

Production verification:
- Vercel production deployment completed successfully.
- `https://playsgrid.org` returns HTTP 200.
- `https://www.playsgrid.org` redirects to `https://playsgrid.org/`.
- Production browser title is `Final Answer | Private Quiz Game`.
- Production browser check found Final Answer content, main buttons, Fastest Finger preview, and prize ladder.
- Production Join Room placeholder interaction works.
- Production browser console errors: none found.

## 2026-06-14 - Milestone 2 Account Code

Checks run:
- `npm.cmd run typecheck` - passed after tightening validation helper return types.
- `npm.cmd run lint` - passed after removing unnecessary manual memoization.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - first attempt hit a Windows/OneDrive generated-file lock on `.next/server/app/api`.
- Removed the generated `.next` folder and reran `npx.cmd next build` - passed.

Build result:
- Production build includes dynamic account routes:
  - `/api/account/signup`
  - `/api/account/login`
  - `/api/account/logout`
  - `/api/account/session`
  - `/api/account/profile`

Local browser tests at `http://127.0.0.1:3000`:
- Final Answer account UI renders.
- Create Account form is visible.
- Invalid PIN is blocked with `PIN must be exactly 4 digits.`
- Valid signup attempt shows Supabase setup-required message because env vars are not configured yet.
- Login panel opens.
- Setup-required message lists missing Supabase environment variables.
- Mobile viewport check at 390 x 844 has no horizontal overflow.
- Browser console errors: none found.

Not fully testable yet:
- Real create account.
- Duplicate username blocking.
- Login with correct PIN.
- Wrong PIN against a real account.
- Failed-attempt lockout.
- Logout after real session creation.
- Profile persistence.

Reason:
- Supabase database tables and Vercel environment variables are not configured yet.

Production verification:
- Vercel production deployment completed successfully.
- `https://playsgrid.org` returns HTTP 200.
- `https://www.playsgrid.org` redirects to `https://playsgrid.org/`.
- Production browser title is `Final Answer | Private Quiz Game`.
- Production browser shows Create Account, Log In, Username, Display name, and 4-digit PIN UI.
- Production signup attempt shows Supabase setup-required message.
- Production browser console errors: none found.

## 2026-06-14 - Supabase Setup Progress

Actions completed:
- Restored existing Supabase project `chhdhlmnlocxwgqdqfip`.
- Verified the database responds to SQL.
- Applied `supabase/final-answer-account-schema.sql`.
- Verified these tables exist:
  - `accounts`
  - `account_stats`
  - `account_login_attempts`
  - `account_sessions`
- Verified RLS is enabled on all four tables.
- Added `NEXT_PUBLIC_SUPABASE_URL` to Vercel production.

Still required:
- Real account production verification after keys are added.

Reason not fully complete:
- The Supabase connector does not expose publishable or secret key values.
- Secret values should not be pasted into chat.

## 2026-06-15 - Production Account Verification

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Production environment:
- Vercel deployment `dpl_D9ok1oCaXqh7fWWZzAwrLYEAaSzu` was Ready before account verification.
- Vercel production env vars were present:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`

Bug found and fixed:
- Initial production signup/login returned 500.
- Cause: after the Supabase project restore completed, the account tables were not present/exposed to the Supabase REST API.
- Fix: reapplied `supabase/final-answer-account-schema.sql`, added `service_role` grants, and requested a PostgREST schema reload.
- The schema file now includes the required grants and schema reload statement.

Production account tests:
- Signup works with a new test account.
- Duplicate username returns `409` with `username_taken`.
- Session check after signup returns the logged-in account.
- Display-name update works.
- Profile/stats load with default zero values.
- Logout works.
- Session check after logout returns no account.
- Login works after logout.
- Wrong PIN returns `401` with `invalid_login`.
- 5 failed PIN attempts lock the username; the next correct-PIN login returns `429` with `too_many_attempts`.
- Public page and Next.js browser assets were scanned for `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_`, `pin_hash`, `account_sessions`, and `scrypt:`; no leaks were found.
- Direct database check confirmed the test account PIN is stored as a `scrypt` hash, not plaintext.

Result:
- Account system passes production verification.
- Milestone 3 is approved to begin.

## 2026-06-15 - Milestone 3 Private Rooms

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Database checks:
- Added `supabase/final-answer-room-schema.sql`.
- Applied the schema to Supabase project `chhdhlmnlocxwgqdqfip`.
- Verified `rooms` and `room_players` exist.
- Verified RLS is enabled on both room tables.
- Verified `service_role` has select, insert, update, and delete grants for both room tables.
- Requested a PostgREST schema reload.

Production API tests at `https://playsgrid.org`:
- Logged-out user cannot create a room: passed with `401 not_logged_in`.
- Logged-out user cannot join a room: passed with `401 not_logged_in`.
- Logged-in user can create a room: passed.
- Room code is generated: passed.
- Second logged-in user can join by code: passed.
- Invalid room code is blocked: passed with `400 invalid_room_code`.
- Valid-format missing room code is blocked: passed with `404 room_not_found`.
- Room full is blocked: passed with `409 room_full`.
- Start is blocked before players are ready: passed with `409 not_all_ready`.
- Ready state updates for both players: passed.
- Start becomes valid only when the room is full and all active players are ready: passed.
- Host can start a valid room: passed; status moved to `in_game`.
- Player leaving after `in_game` is marked as `leftDuringGame`: passed.
- Player who left after `in_game` cannot rejoin that game: passed with `409 game_already_started`.
- Host leaving before the game starts transfers host to the next remaining player: passed.
- Player who left before the game starts can rejoin by code: passed.

Production browser tests at `https://playsgrid.org`:
- Public page loads with title `Final Answer | Private Quiz Game`.
- Browser signup through the Create Account form works.
- Create Room opens the real create-room form.
- A room can be created from the browser UI.
- The lobby shows the room code, waiting status, player count, host badge, ready status, Ready button, disabled Start Game button, Refresh Room, and Leave Room.
- Ready button toggles to Not Ready.
- Start Game stays disabled when only the host is in a 2-player room.
- Mobile viewport check at 390 x 844 for the room lobby has no horizontal overflow.
- Browser console errors: none found.

Known limits:
- Chat is not part of Milestone 3.
- Starting the room only changes status to `in_game`; Fastest Finger First starts in a later milestone.
- Room lobby state is not automatically restored after a full browser reload; users can rejoin by room code while the room is still waiting.
