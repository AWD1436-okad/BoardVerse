# Deployment and Handover

## Product Summary

Final Answer is a private browser-based quiz game for friends and family. Players create simple accounts, join private rooms by code, compete in Fastest Finger First, take hot-seat turns through a 12-level money ladder, use lifelines, and compare final results.

The previous PlayGrid board-game product is retired and can be replaced.

## Current Hosting

- Domain: `https://playsgrid.org`.
- `www` redirects to the apex domain.
- Hosting: Vercel.
- Vercel project currently linked as `boardverse`.
- GitHub remote: `https://github.com/AWD1436-okad/BoardVerse.git`.
- Current public app: Final Answer first complete family-testing version through Milestone 11.

## How To Run Locally

1. Install dependencies with `npm.cmd install`.
2. Start local development with `npm.cmd run dev`.
3. Open the local URL shown by Next.js.

## Required Environment Variables

Configured in Vercel production:
- `NEXT_PUBLIC_SUPABASE_URL`: browser-safe Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe Supabase publishable key. This is expected for later client-side Supabase features.
- `SUPABASE_SECRET_KEY`: server-only Supabase secret key used by Next.js API routes to create accounts, verify PINs, create sessions, and update profiles.

Current setup status:
- Supabase project `chhdhlmnlocxwgqdqfip` has been restored.
- Account tables have been created from `supabase/final-answer-account-schema.sql`.
- `NEXT_PUBLIC_SUPABASE_URL` has been added to Vercel production.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` has been added in Vercel production.
- `SUPABASE_SECRET_KEY` has been added in Vercel production.
- Production account signup/login/logout/profile behavior has been verified.

Legacy fallback:
- `SUPABASE_SERVICE_ROLE_KEY` can be used instead of `SUPABASE_SECRET_KEY` if the Supabase project only shows legacy API keys.

Secrets must not be committed to code or normal notes.

## Data Storage Plan

Use Supabase Postgres for accounts, rooms, game state, questions, question reports, and stats. PINs are hashed server-side before storage.

Milestone 2 account tables are defined in:
- `supabase/final-answer-account-schema.sql`

Tables:
- `accounts`
- `account_stats`
- `account_login_attempts`
- `account_sessions`

Milestone 3 room tables are defined in:
- `supabase/final-answer-room-schema.sql`

Tables:
- `rooms`
- `room_players`

Milestone 4 question tables are defined in:
- `supabase/final-answer-question-schema.sql`

Starter question seed files:
- `supabase/final-answer-question-seed.sql`
- `src/lib/final-answer/starter-questions.json`
- `scripts/generate-question-seed.mjs`

Tables:
- `questions`
- `question_reports`

Admin support:
- `accounts.is_admin` controls access to admin-only question report routes.
- To make an account an admin, open Supabase SQL Editor and run:

```sql
update public.accounts
set is_admin = true
where username = 'chosen_username';
```

- To remove admin access, run the same update with `false`.

Milestone 5 realtime game-state tables are defined in:
- `supabase/final-answer-game-state-schema.sql`

Tables and fields:
- `game_states`: one server-recorded state record per room, including current room status, host account id, join order, completed-turn account ids, eligible account ids, and future hot-seat account id.
- `room_events`: append-only room event notifications used by Supabase Realtime so browsers can refresh room state without manual reloads.

Realtime behavior:
- Server API routes make the real room/game-state changes.
- Server API routes write a `room_events` row after joins, leaves, ready changes, host changes, status changes, and game starts.
- Browsers subscribe to `room_events` through Supabase Realtime using the publishable key.
- Browsers refresh room data through the existing server API after an event arrives.
- A 30-second polling fallback remains in place.

Milestone 6 Fastest Finger tables are defined in:
- `supabase/final-answer-fastest-finger-schema.sql`

Fastest Finger seed/data files:
- `src/lib/final-answer/starter-fastest-finger-questions.js`
- `scripts/seed-fastest-finger.mjs`

Tables and fields:
- `fastest_finger_questions`: ordering prompts, four items, correct order, category, active status, and report count.
- `fastest_finger_rounds`: room/game-state round records, chosen question, round number, start/end timestamps, status, and winner.
- `fastest_finger_submissions`: account submission records, submitted order, correctness, response milliseconds, and submission timestamp.
- `game_states.current_fastest_finger_round_id`: active/latest Fastest Finger round.
- `game_states.fastest_finger_winner_account_id`: winner who should enter hot seat.

Fastest Finger behavior:
- The browser only receives the prompt and shuffled items.
- Correct order remains server-side.
- The server records response time and correctness.
- If every eligible player is wrong, the next round starts immediately.
- If multiple players are correct, fastest response wins; exact ties fall back to earliest submitted timestamp.
- Winner moves the room to `hot_seat`.

Milestone 7 Hot Seat tables are defined in:
- `supabase/final-answer-hot-seat-schema.sql`

Tables and fields:
- `hot_seat_turns`: one row per player's hot-seat turn, including current level, current prize, current question, selected/final answer, reveal status, final winnings, levels completed, questions correct, and placement-rank placeholder.
- `game_states.current_hot_seat_turn_id`: the active/latest Hot Seat turn for the room.

Hot Seat behavior:
- The server creates the Hot Seat turn when a room reaches `hot_seat`.
- The browser receives the visible question and four answers, but not the correct answer before reveal.
- The hot-seat player selects an answer and confirms it as final.
- The server locks the answer, checks correctness, applies safety nets, and emits room events.
- Correct answers advance to the next level.
- Wrong answers end the turn and store final winnings.
- Completed players are removed from the next Fastest Finger round.
- The room returns to `fastest_finger` when eligible players remain, or moves to `completed` when everyone has played.

Plain-English Supabase setup:
1. Open Supabase and create a project, or open the existing project you want to use.
2. Go to SQL Editor.
3. Open `supabase/final-answer-account-schema.sql` from this repo.
4. Copy the SQL into Supabase SQL Editor and run it once.
5. Go to Project Settings, then API Keys.
6. Copy the project URL into Vercel as `NEXT_PUBLIC_SUPABASE_URL`.
7. Copy the publishable key into Vercel as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
8. Copy the server-side secret key into Vercel as `SUPABASE_SECRET_KEY`.
9. Redeploy the Vercel production app.

Room setup:
1. Open Supabase SQL Editor.
2. Run `supabase/final-answer-room-schema.sql`.
3. Confirm `rooms` and `room_players` exist.
4. Redeploy the Vercel production app if this schema was added after code deployment.

Question setup:
1. Run `supabase/final-answer-question-schema.sql`.
2. Deploy the app.
3. Make an owner/admin account by setting `accounts.is_admin` to `true` for the chosen username in Supabase.
4. As that admin account, call the protected seed route or use the included seed SQL to insert starter questions.
5. Confirm there are 1,200 active Hot Seat questions, 100 at each level.

Realtime game-state setup:
1. Run `supabase/final-answer-game-state-schema.sql`.
2. Confirm `game_states` and `room_events` exist.
3. Confirm `room_events` is included in the `supabase_realtime` publication.
4. Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured in Vercel so the browser can subscribe to room events.
5. Redeploy the Vercel production app.

Fastest Finger setup:
1. Run `supabase/final-answer-fastest-finger-schema.sql`.
2. Seed starter questions with `npm.cmd run seed:fastest-finger` if local server secrets are available, or insert the starter set through Supabase SQL/admin tooling.
3. Confirm `fastest_finger_questions` has at least 100 active rows.
4. Redeploy the Vercel production app.

Hot Seat setup:
1. Run `supabase/final-answer-hot-seat-schema.sql`.
2. Confirm `hot_seat_turns` exists.
3. Confirm `game_states.current_hot_seat_turn_id` exists.
4. Confirm `room_events` accepts Hot Seat event types.
5. Redeploy the Vercel production app.

Milestone 8 lifeline data is also defined in:
- `supabase/final-answer-hot-seat-schema.sql`

Lifeline fields:
- `hot_seat_turns.used_5050`
- `hot_seat_turns.used_audience`
- `hot_seat_turns.used_pass`
- `hot_seat_turns.removed_answers`
- `hot_seat_turns.audience_percentages`
- `hot_seat_turns.pass_queue_snapshot`

Lifeline behavior:
- 50:50 is calculated server-side, stores removed answer keys, and blocks removed answers from being selected.
- Ask The Audience is generated server-side with fake percentages only.
- Pass rotates the eligible player queue server-side and does not mark the passing player as complete.
- Browsers see lifeline effects through the existing room event refresh flow.

Milestone 9 results and in-game reporting are defined in:
- `supabase/final-answer-results-schema.sql`

Results fields:
- `rooms.results_finalized_at`
- `game_results.room_id`
- `game_results.account_id`
- `game_results.display_name`
- `game_results.final_winnings`
- `game_results.highest_level_reached`
- `game_results.questions_answered_correctly`
- `game_results.fastest_finger_wins`
- `game_results.won_outright`
- `game_results.tied_for_first`
- `game_results.placement`
- `game_results.completed_at`

Results behavior:
- The server finalizes results after a room reaches `completed`.
- Ranking is based on final winnings.
- Tied players share the same placement.
- Account stats update once when results are finalized.
- Refreshing the completed results screen should not double-count stats.

In-game question reporting:
- Hot Seat players can report the current question for Wrong answer, Ambiguous wording, Typo, or Other.
- Reports can include an optional short note.
- Reports store room and Hot Seat turn context.
- Report counts update automatically.
- A player cannot repeatedly report the same Hot Seat question turn.

Starter Hot Seat question data:
- The current Hot Seat seed file contains 1,200 questions, 100 at each level.
- Correct answers are balanced across A, B, C, and D.
- Run `npm.cmd run question:audit` before deployment when question data changes.
- The question bank should still receive owner review before broad use.

Milestone 10 admin question tools:
- Admin-only API: `/api/admin/questions`.
- Admins are controlled through `accounts.is_admin`.
- Admins can view question counts, active/inactive counts, report counts, answer balance, report details, and question filters.
- Admins can mark questions inactive or reactivate questions.
- Advanced direct editing of question text/answers is intentionally not built yet.

How to review reported questions:
1. Log into `https://playsgrid.org` with an admin account.
2. Open the account/profile area.
3. Use the Question Review admin panel.
4. Filter by reported questions using minimum reports `1`, or search/filter by level, category, or active status.
5. Read the report reason and note.
6. Mark the question inactive if it should stop appearing.
7. Reactivate it later if it is safe to use again.

How to regenerate and seed questions:
1. Edit `scripts/generate-question-seed.mjs` only if the generation rules need to change.
2. Run `node scripts/generate-question-seed.mjs`.
3. Run `npm.cmd run question:audit`.
4. Review the generated `src/lib/final-answer/starter-questions.json`.
5. Deploy the app.
6. Log in as an admin and call the protected seed route, or use the generated SQL in `supabase/final-answer-question-seed.sql`.
7. Confirm there are 1,200 active questions, 100 per level, and A/B/C/D balance is 300 each.

## Manual Family Testing Checklist

Use this checklist for the first real family test session:

1. Open `https://playsgrid.org` on a computer and on at least one phone.
2. Create two or more accounts with unique usernames and 4-digit PINs.
3. Try a wrong PIN and confirm login is rejected.
4. Log in successfully.
5. Check the profile/stats panel loads.
6. Create a private room with 2 players.
7. Share the room code.
8. Join the room from the second account.
9. Confirm invalid room codes show an error.
10. Press Ready on every player.
11. Confirm Start Game is disabled until the room is full and everyone is ready.
12. Start the game.
13. Complete Fastest Finger by arranging answers.
14. Confirm the winner enters the Hot Seat.
15. Select an answer, cancel once, then confirm a final answer.
16. Use 50:50 and confirm two answers disappear.
17. Use Ask The Audience and confirm percentages appear.
18. Use Pass in a game with another eligible player and confirm the next player enters the Hot Seat.
19. Try Pass when no other eligible player remains and confirm it is blocked.
20. Report a Hot Seat question with a reason and optional note.
21. Finish every player's Hot Seat turn.
22. Confirm final results show placements and ties correctly.
23. Return home and confirm profile stats changed.
24. On an admin account, load Question Review and confirm the report appears.
25. On a normal account, confirm admin tools are not visible and admin API access is blocked.
26. Repeat key screens on a phone: landing, forms, lobby, Fastest Finger, Hot Seat, lifelines, results.

## Launch Readiness

Final Answer is ready for first friends-and-family testing.

Use it as a private family beta:
- Expect gameplay to work end to end.
- Ask testers to report confusing or wrong questions.
- Avoid adding big features until the first real play session has been observed.
- Review reported questions after each session.
- Keep a short list of any bugs, confusing screens, or slow moments.

Important:
- Do not paste Supabase keys into chat.
- Do not put Supabase keys into code.
- The secret key must not start with `NEXT_PUBLIC_` because that would expose it to browsers.

## Deployment Plan

Standard production flow:
1. Make code changes.
2. Run checks.
3. Commit to Git.
4. Push to GitHub `main`.
5. Deploy to Vercel production.
6. Verify Vercel status is Ready.
7. Browser-check `https://playsgrid.org`.

## Current Known Limitations

- The live app should now show the Final Answer foundation after the latest production deployment.
- Final Answer Milestone 1 is implemented.
- Milestone 2 account code is implemented, deployed, connected to Supabase, and production-verified.
- Milestone 3 private rooms are implemented, deployed, connected to Supabase, and production-verified.
- Milestone 4 question database and reporting foundation is implemented, deployed, connected to Supabase, seeded, and production-verified.
- Milestone 5 realtime game-state foundation is implemented, deployed, connected to Supabase, and production-verified.
- Milestone 6 Fastest Finger First is implemented, deployed, connected to Supabase, seeded, and production-verified.
- Milestone 7 Hot Seat Core Gameplay is implemented, deployed, connected to Supabase, and production-verified.
- Milestone 8 Lifelines is implemented, deployed, connected to Supabase, and production-verified.
- Milestone 9 Final Results, Stats, and In-Game Reporting is implemented, deployed, connected to Supabase, and production-verified through API/database checks.
- Milestone 10 Full Question Bank and Admin Tools is implemented, deployed, seeded, and production-verified.
- Milestone 11 Final Polish and Launch Readiness is implemented, deployed, and production-verified.
- No chat, sound effects, or advanced admin question editing exists yet.
- Starting a room now creates a `game_states` record, starts Fastest Finger, moves the winner to `hot_seat`, and plays through hot-seat turns until the room is `completed`.
- Hot Seat players can now use 50:50, Ask The Audience, and Pass.
- The 1,200-question generation/import process exists, but owner review is still needed before broad family use.
- Normal-user temporary debug and question-test panels are hidden.
- Start Game should eventually become a single Postgres transaction/function to reduce partial-update risk.
