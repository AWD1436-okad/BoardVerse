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

## 2026-06-15 - Milestone 4 Question Database and Reporting

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Database actions:
- Applied `supabase/final-answer-question-schema.sql` to Supabase project `chhdhlmnlocxwgqdqfip`.
- Added `questions` and `question_reports`.
- Added `accounts.is_admin`.
- Seeded starter questions through the protected admin seed route.

Database verification:
- Total questions: 240.
- Active questions: 240.
- Level 1, `$100`: 20 active questions.
- Level 2, `$500`: 20 active questions.
- Level 3, `$1,000`: 20 active questions.
- Level 4, `$4,000`: 20 active questions.
- Level 5, `$8,000`: 20 active questions.
- Level 6, `$16,000`: 20 active questions.
- Level 7, `$32,000`: 20 active questions.
- Level 8, `$64,000`: 20 active questions.
- Level 9, `$125,000`: 20 active questions.
- Level 10, `$250,000`: 20 active questions.
- Level 11, `$500,000`: 20 active questions.
- Level 12, `$1,000,000`: 20 active questions.
- RLS is enabled on `questions` and `question_reports`.

Production API tests at `https://playsgrid.org`:
- Admin-only starter seed route inserted 240 questions and returned 20 per level.
- Random question selection by level works.
- Random question responses do not include `correctAnswer`.
- Inactive questions are skipped. Verification used a temporary inactive question and excluded all active level-1 questions; the API returned `404 question_not_found`, then the temporary row was removed.
- Question report saves successfully.
- Question report count increments.
- Admin reported-question query returns reported questions and report counts.

Production browser tests at `https://playsgrid.org`:
- Public page loads with title `Final Answer | Private Quiz Game`.
- Logged-in Question Bank Test panel appears.
- Load Question button loads a question.
- Report Question button saves a report.
- Mobile viewport check at 390 x 844 has no horizontal overflow.
- Browser console errors: none found.

Known limits:
- This milestone does not start Fastest Finger First.
- This milestone does not start hot-seat gameplay.
- This milestone does not add lifelines.
- The 240-question starter set is for proving the system and should be reviewed before the full 1,200-question import.

## 2026-06-15 - Milestone 5 Realtime Game State

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed after moving realtime refresh calls out of direct effect state updates.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Database actions:
- Added and applied `supabase/final-answer-game-state-schema.sql`.
- Added `rooms.membership_locked_at`.
- Replaced the old room status constraint with `waiting`, `starting`, `fastest_finger`, `hot_seat`, and `completed`.
- Converted existing `in_game` rows to `fastest_finger` before applying the new constraint.
- Added `game_states` for server-recorded gameplay state.
- Added `room_events` for Supabase Realtime notifications.
- Added `room_events` to the `supabase_realtime` publication.
- Requested a PostgREST schema reload.

Database verification:
- `game_states` exists and has RLS enabled.
- `room_events` exists and has RLS enabled.
- `room_events` is in the Supabase Realtime publication.
- `anon` can select `room_events` for realtime subscriptions.
- `service_role` can read and write `game_states` and `room_events`.

Production API tests at `https://playsgrid.org`:
- Created a 2-player room.
- Second logged-in account joined by room code.
- Start before all players were ready was blocked with `409 not_all_ready`.
- Both players set Ready.
- Host started the game successfully.
- Room status moved to `fastest_finger`.
- A `game_states` record was created.
- `join_order` contained both active players.
- `eligible_account_ids` contained both active players.
- `hot_seat_account_id` stayed empty, as expected for this foundation milestone.
- Player leaving after start was marked as `leftDuringGame`.
- That player was blocked from rejoining the same in-progress game with `409 game_already_started`.
- Host transfer before start still worked.
- A player who left before start could rejoin by code.

Production event verification:
- The test room recorded `player_joined`, `ready_changed`, `room_status_changed`, `game_started`, and `player_left` events.
- Event records matched the room actions performed during the test.

Production browser tests at `https://playsgrid.org`:
- Room lobby showed `Realtime subscribed`.
- A second player joined through the production API and appeared in the browser lobby without pressing Refresh.
- Temporary game-state debug information appeared on desktop.
- Host Ready button worked.
- Browser console errors: none found.
- Mobile viewport check at 390 x 844 had no horizontal overflow.

Known limits:
- Fastest Finger First questions and ordering gameplay are intentionally not built yet.
- Hot-seat gameplay and lifelines are intentionally not built yet.
- Start Game uses sequential server operations, not one database transaction; this should be hardened before a larger launch.

## 2026-06-15 - Milestone 6 Fastest Finger First

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Database actions:
- Applied `supabase/final-answer-fastest-finger-schema.sql`.
- Added `fastest_finger_questions`.
- Added `fastest_finger_rounds`.
- Added `fastest_finger_submissions`.
- Added `game_states.current_fastest_finger_round_id`.
- Added `game_states.fastest_finger_winner_account_id`.
- Extended `room_events` to include `fastest_finger_round_started`, `fastest_finger_submitted`, and `fastest_finger_winner`.
- Seeded 100 active Fastest Finger ordering questions.

Database verification:
- Active Fastest Finger questions: 100.
- RLS enabled on `fastest_finger_questions`, `fastest_finger_rounds`, and `fastest_finger_submissions`.
- New game-state columns exist.
- Production test actions created rounds, submissions, winner records, and Fastest Finger room events.

Production API tests at `https://playsgrid.org`:
- Created a 2-player room.
- Both players joined and set Ready.
- Host started the game.
- Fastest Finger question loaded.
- Response included four items and a 30-second server timer.
- Response did not expose `correct_order` or `correctOrder`.
- Wrong submissions from all eligible players saved.
- Nobody-correct flow immediately returned a new Fastest Finger round.
- Correct submissions from both players saved.
- Fastest correct player won.
- Room status moved to `hot_seat`.
- `game_states.hot_seat_account_id` matched the Fastest Finger winner.
- Multiple correct submissions were handled deterministically by response time, then submitted timestamp if needed.

Production browser tests at `https://playsgrid.org`:
- Live page loaded with Final Answer branding.
- Browser room creation worked.
- Second player joined through the production API and appeared through realtime sync.
- Host Ready worked in the browser.
- Start Game opened the Fastest Finger UI.
- Fastest Finger UI showed Round number, 30-second countdown, prompt, four reorderable items, move controls, Submit Order, and submission count.
- Browser submission worked and showed "Waiting for other players...".
- Expired/nobody-correct round advanced to a new Round 2 question.
- Browser console errors: none found.

Known limits:
- Hot-seat gameplay is intentionally not built yet.
- Lifelines are intentionally not built yet.
- Fastest Finger uses sequential server writes rather than a single database function; this is acceptable for the private MVP but should be hardened later.

## 2026-06-15 - Milestone 7 Hot Seat Core Gameplay

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed after removing a direct state update from an effect.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Database actions:
- Applied `supabase/final-answer-hot-seat-schema.sql` to Supabase project `chhdhlmnlocxwgqdqfip`.
- Added `hot_seat_turns`.
- Added `game_states.current_hot_seat_turn_id`.
- Extended `room_events` to include `hot_seat_question_loaded`, `hot_seat_answer_locked`, and `hot_seat_turn_completed`.
- Requested a PostgREST schema reload.

Production deployment:
- Commit `5cff575` was pushed to `main`.
- Vercel production deployment became Ready.
- Latest checked deployment URL: `https://boardverse-55yeuo1lq-abdul-malik-durranis-projects.vercel.app`.
- Public domain checked: `https://playsgrid.org`.

Production API tests at `https://playsgrid.org`:
- Created two new test accounts.
- Created a 2-player private room.
- Second player joined by room code.
- Both players set Ready and the host started the game.
- Fastest Finger winner moved into Hot Seat.
- Hot Seat started at level 1 for `$100`.
- Hot Seat question loaded without exposing `correctAnswer` before reveal.
- Correct answers advanced from level 1 through level 7.
- Wrong answer at level 8 paid the `$32,000` safety net.
- After the first turn completed, the room returned to `fastest_finger`.
- Completed player was blocked from the next Fastest Finger round with `403`.
- The remaining eligible player won the next Fastest Finger round and entered Hot Seat.
- Wrong answer before reaching the `$1,000` safety net paid `$0`.
- After both players completed a turn, the room moved to `completed`.
- Homepage loaded and contained Final Answer branding.

Production browser/UI checks:
- MCP browser backend could not keep Chrome open, so browser verification used the Playwright CLI.
- `npx.cmd playwright screenshot --full-page https://playsgrid.org .\tmp-playgrid-desktop.png` - passed.
- `npx.cmd playwright screenshot --viewport-size=390,844 --full-page https://playsgrid.org .\tmp-playgrid-mobile.png` - passed.
- Desktop screenshot showed Final Answer branding, account form, Fastest Finger preview, and prize ladder.
- Mobile screenshot showed the page stacked correctly with no obvious overlap.
- Temporary screenshots were removed after inspection.

Vercel runtime check:
- Vercel production runtime logs for errors/fatal logs in the verification window returned no logs.

Known limits:
- Lifelines are intentionally not built yet.
- Final results/rankings are intentionally not built yet.
- Gameplay stats updates are not built yet.
- Hot-seat question reporting UI is not yet attached to the gameplay screen.
- Hot-seat server updates are sequential rather than one database transaction.

## 2026-06-16 - Milestone 8 Lifelines

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Database actions:
- Applied the Milestone 8 Hot Seat lifeline schema to Supabase project `chhdhlmnlocxwgqdqfip`.
- Added lifeline fields to `hot_seat_turns`: `used_5050`, `used_audience`, `used_pass`, `removed_answers`, `audience_percentages`, and `pass_queue_snapshot`.
- Extended `room_events` to allow `hot_seat_lifeline_used`.
- Requested a PostgREST schema reload through the migration SQL.

Production API tests at `https://playsgrid.org`:
- Created temporary test accounts and private rooms.
- Started rooms, completed Fastest Finger, and entered Hot Seat.
- Verified Fastest Finger public API responses do not expose `correct_order` or `correctOrder`.
- Verified Hot Seat public API responses do not expose `correctAnswer` before reveal.
- Verified 50:50 removes exactly two answers.
- Verified 50:50 cannot be used twice.
- Verified removed answers cannot be selected and return `409 answer_removed`.
- Verified Ask The Audience after 50:50 returns percentages totaling 100 and removed answers at 0%.
- Verified Ask The Audience cannot be used twice.
- Verified another player sees the 50:50 and Ask The Audience effects through refreshed room state.
- Verified Pass moves the hot-seat player to the back of the eligible queue.
- Verified Pass brings the next eligible player into the Hot Seat at the same level with a new question.
- Verified Ask The Audience first, then 50:50 works and keeps removed answers at 0%.
- Verified high-level Ask The Audience at level 8 returned a less-confident correct-answer percentage within the intended 25-60 range.
- Verified Pass is blocked with `409 pass_unavailable` when no other eligible player can take over.

Production browser/UI checks:
- Initial Playwright screenshot checks failed because the local Playwright Chromium runtime was missing.
- Installed the Playwright Chromium runtime.
- `npx.cmd playwright screenshot --full-page https://playsgrid.org tmp-final-answer-lifelines-desktop.png` - passed.
- `npx.cmd playwright screenshot --viewport-size=390,844 --full-page https://playsgrid.org tmp-final-answer-lifelines-mobile.png` - passed.
- Desktop screenshot showed Final Answer branding, account form, Fastest Finger preview, prize ladder, and Three Lifelines content without obvious overlap.
- Mobile screenshot showed the page stacked correctly with no horizontal overflow or obvious overlap.
- Temporary screenshots were removed after inspection.

Known limits:
- Final rankings and gameplay stats updates are intentionally not built yet.
- In-game question reporting is intentionally left for Milestone 9.
- Chat is not built.
- The full 1,200-question set is not built.
- The starter Hot Seat question bank currently has all correct answers as answer A and should be balanced before broader family use.

## 2026-06-16 - Milestone 9 Final Results, Stats, and In-Game Reporting

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Database actions:
- Applied `supabase/final-answer-results-schema.sql` to Supabase project `chhdhlmnlocxwgqdqfip`.
- Added `rooms.results_finalized_at`.
- Added `game_results`.
- Added room, Hot Seat turn, and note fields to `question_reports`.
- Added one-report-per-Hot-Seat-turn unique protection for question reports.
- Rebalanced the current 240 active Hot Seat starter questions across A, B, C, and D.

Database verification:
- Local starter question file contains 240 questions.
- Local starter question correct-answer spread is A: 60, B: 60, C: 60, D: 60.
- Production active question correct-answer spread is A: 60, B: 60, C: 60, D: 60.
- Production `question_reports_one_per_turn_idx` exists.

Local app checks:
- Local dev server returned HTTP 200 for `/`.
- Local homepage HTML contained Final Answer, Create Account, and Join Room content.
- Local API session route correctly reported missing Supabase variables in local `.env.local`; production verification must use Vercel variables.

Browser/UI checks:
- Playwright browser MCP failed before opening a page because the target browser page closed during launch.
- Browser verification will be completed against the deployed production site after Vercel deploys the committed changes.

Production deployment verification:
- Commit `19bf789` deployed to Vercel as `dpl_6w78LFJUH43LoUwKRuT3sq9huZwN` and reached Ready.
- `https://playsgrid.org` returned HTTP 200.
- `https://playsgrid.org` contained Final Answer, Create Account, and Join Room content.
- `/api/account/session` returned `configured: true`, confirming production Supabase variables are active.

Production results/stat tests:
- Created production test accounts through the live signup API.
- Created and joined private rooms through the live room APIs.
- Used controlled completed-game database rows to verify deterministic finalization behavior.
- Verified a highest-winnings result ranks 1st, marks `wonOutright`, and updates wins, games played, highest prize won, total money won, Fastest Finger wins, and questions answered correctly.
- Called the results endpoint twice and verified stats did not double-count.
- Verified tied highest winnings give both players placement 1 and `tiedForFirst`.
- Verified tie stats update.

Production question-report tests:
- Submitted a Hot Seat question report with room id, Hot Seat turn id, reason, and note.
- Verified report count increased.
- Verified a second report for the same Hot Seat question turn was blocked with `409 already_reported`.
- Temporarily marked the production test account as admin and verified the admin report list returned reported questions with reasons and context.

Build issue and repair:
- One `npx.cmd next build` run failed because the hidden local dev server held a Windows file lock in `.next`.
- Stopped the local dev server process, removed the generated `.next` folder after path verification, and reran `npx.cmd next build` successfully.

Known limits:
- Full manual browser gameplay through the visible UI still needs a human click-through because the Playwright browser MCP could not keep Chrome open in this session.
- The full 1,200-question set is not built.
- Admin question editing/deactivation tools are not built.
- Chat and sound effects are not built.

## 2026-06-16 - Milestone 10 Full Question Bank and Admin Tools

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run question:audit` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Local data verification:
- Hot Seat seed questions: 1,200.
- Per-level count: 100 questions at each level from 1 through 12.
- Correct-answer balance: A: 300, B: 300, C: 300, D: 300.
- Exact duplicate Hot Seat question text: none found by the audit.
- Fastest Finger starter questions: 100.
- Fastest Finger audit found no duplicate prompts or invalid order keys.

Implementation verification:
- Added admin question summary API and panel.
- Admin question summary includes total, active, inactive, reported, level counts, category counts, and answer balance.
- Admin filters support level, category, active/inactive/all, minimum report count, and search.
- Admin can mark questions inactive and reactivate them through server routes.
- Question audit verifies answer completeness, prize amount mapping, correct-answer validity, duplicates, and banned-topic terms in the seed data.
- Production API testing found that the admin summary initially returned only 1,000 rows because Supabase paginates selects by default. The summary function now paginates through all question rows before calculating totals and balance.
- One build retry hit a Windows `.next` file-lock from leftover Playwright helper processes. The generated `.next` folder was path-verified, cleared, and `npx.cmd next build` passed afterward.

Production verification:
- Commit `612efc6` deployed to Vercel as `dpl_6YrJrpvxyHKD6Rfox3nvJipdQxRu` and reached Ready.
- `https://playsgrid.org` returned HTTP 200 and contained Final Answer branding.
- The protected admin seed route returned 1,200 seeded questions, 100 at each level.
- Production database verification showed 1,200 active questions, 100 per level, A: 300, B: 300, C: 300, D: 300, no missing answers, no invalid correct-answer keys, no prize mismatches, and no duplicate active question text.
- Production random question API returned a question without `correctAnswer` or `correct_answer`.
- Admin question summary returned 1,200 total, 1,200 active, 0 inactive, and exact A/B/C/D balance.
- Admin deactivate/reactivate controls worked on a production question.
- Question reporting saved a report, increased the report count, appeared in admin review, and duplicate reporting returned `409 already_reported`.
- Existing completed-room results endpoint returned two result rows, confirming result reads still work after the question/admin changes.
- Playwright desktop screenshot of `https://playsgrid.org` passed.
- Playwright mobile screenshot at 390x844 passed with no obvious overlap.
- Vercel runtime logs during verification showed successful 200 responses and the expected 409 duplicate-report response; no server error logs were returned.

## 2026-06-16 - Milestone 11 Final Polish and Launch Readiness

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run question:audit` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Cleanup verified:
- Removed the normal-user temporary game-state debug panel.
- Removed the normal-user question-bank test panel.
- Admin question review remains available only for admin accounts.
- Public `https://playsgrid.org` HTML contains Final Answer and does not contain PlayGrid, BoardVerse, `Question Bank Test`, `Temporary game-state debug`, `SUPABASE_SECRET_KEY`, `pin_hash`, or `correct_answer`.

Production edge-case verification:
- Duplicate username blocked with `409`.
- Wrong PIN blocked with `401`.
- Logged-out create-room blocked with `401`.
- Invalid room code blocked with `400`.
- Room full join blocked with `409`.
- Normal non-admin user blocked from admin question list with `403`.
- Normal non-admin user blocked from admin question activate/deactivate with `403`.
- Host leaving before start transferred host to the remaining player.
- Player leaving before start could rejoin by room code.
- Player leaving after start was blocked from rejoining that game with `409`.

Complete production 2-player game verification:
- Created two live test accounts and a private 2-player room.
- Joined by room code, set both players ready, and started the game.
- Fastest Finger public response did not expose `correct_order` or `correctOrder`.
- Fastest Finger winner entered the Hot Seat.
- Hot Seat public response did not expose `correctAnswer` before reveal.
- Pass moved the first hot-seat player to the back of the queue and brought the next eligible player into the Hot Seat at the same level.
- Wrong answer ended a Hot Seat turn with `$0` before any safety net.
- Remaining player completed the next Fastest Finger round.
- Pass was blocked when no other eligible player remained with `409`.
- 50:50 removed exactly two answers.
- 50:50 duplicate use was blocked with `409`.
- Ask The Audience percentages totaled 100.
- Ask The Audience duplicate use was blocked with `409`.
- Selecting a removed 50:50 answer was blocked with `409`.
- Final wrong answer completed the game.
- Final results returned two result rows.
- Calling results twice did not double-update stats.
- Stats after the completed game showed one game played per player and expected tie/score values.

Security/privacy verification:
- Production account rows use `scrypt:` PIN hashes.
- Production account rows with plain 4-digit PIN hashes: 0.
- RLS is enabled on accounts, stats, sessions, login attempts, rooms, room players, questions, reports, game state, room events, Fastest Finger tables, Hot Seat turns, and game results.
- Normal users cannot access admin question routes.
- Normal users cannot activate or deactivate questions.
- Stats updates remain server-owned through completed-game finalization; there is no normal-user stats update route.

Browser/layout verification:
- `https://playsgrid.org` returned HTTP 200.
- Desktop Playwright screenshot passed visual inspection.
- Mobile Playwright screenshot at 390x844 passed visual inspection.
- Vercel runtime logs during verification showed expected 200 responses and expected 400/401/403/409 guardrail responses; no fatal production runtime errors were found.
