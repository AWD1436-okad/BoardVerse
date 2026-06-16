# Decisions and Assumptions

## Locked Decisions

- Product name: Final Answer.
- Domain: `https://playsgrid.org`.
- Previous PlayGrid and BoardVerse work can be replaced.
- Browser web app only.
- Private rooms only.
- 2-10 players per room.
- Join by room code only.
- No public room list.
- Accounts use username, display name, and 4-digit PIN.
- Usernames cannot be changed later.
- PINs must not be stored in plain text.
- No Phone a Friend lifeline.
- No real-money gambling or real-world value.
- No exact copied TV-show assets, branding, music, fonts, or graphics.

## Technical Assumptions

- Reuse the existing Next.js/Vercel project and `playsgrid.org` deployment setup.
- Use Supabase Postgres for durable data.
- Use server-side routes/actions for account creation and PIN verification.
- Use Supabase Realtime or a simple server-backed realtime approach for rooms and game state.
- Use the full 1,200-question Hot Seat seed bank after Milestone 10, with 100 questions per level and an even A/B/C/D correct-answer spread.
- Use a custom username/PIN account table for Final Answer instead of Supabase Auth email/password, because this private family app requires username plus 4-digit PIN.
- Hash PINs server-side before database storage.
- Use HTTP-only session cookies with hashed session tokens stored in Supabase.
- Lock a username for 10 minutes after 5 failed login attempts.
- Store private rooms in Supabase `rooms` and `room_players` tables.
- Keep room creation, joining, ready changes, leaving, and start checks behind server API routes so room rules are enforced consistently.
- Use Supabase Realtime for room/game-state synchronization, with a 30-second polling fallback.
- Store realtime notifications in `room_events`; browser clients subscribe to event inserts and then refresh authoritative room state through the server API.
- Keep direct `game_states` reads server-side for now. The browser receives game-state data through room API responses, not through direct table access.
- Keep Start Game server-owned: validate room fullness and ready state, lock membership, create game state, and move the room to `fastest_finger`.
- Keep chat out of Milestone 3 to avoid adding moderation and safety scope before the lobby foundation is stable.
- Store questions in Supabase `questions` with a separate `question_reports` table.
- Keep public question selection behind server routes and exclude `correct_answer` from public random-question responses.
- Keep the generated 1,200-question Hot Seat bank auditable through `npm.cmd run question:audit` before deployment.
- Use an `is_admin` boolean on accounts for the first admin foundation.
- Keep the admin seed route protected by account admin status.
- Store Fastest Finger ordering questions separately from hot-seat questions.
- Keep Fastest Finger correct orders server-side only; browser responses include prompt and item keys/text, not the correct order.
- Use server-created round timestamps for the 30-second Fastest Finger timer.
- Resolve Fastest Finger winners by fastest correct server-recorded response time, then earliest submitted timestamp if response times match exactly.
- Move rooms to `hot_seat` after a Fastest Finger winner is found, but leave actual Hot Seat gameplay for Milestone 7.
- Store Hot Seat progress in a dedicated `hot_seat_turns` table.
- Keep Hot Seat correct answers server-side until the answer reveal. Before reveal, browser responses include only the visible question and answer choices.
- Use a short client-side suspense delay after the server locks a final answer, while the actual correctness and safety-net decision is made server-side.
- Keep Hot Seat progression manual after a reveal: the hot-seat player presses Continue/Next Question so everyone can see the reveal state before the game moves on.
- Apply safety nets from completed levels: fewer than 3 completed levels pays `$0`, 3-6 completed levels pays `$1,000`, and 7 or more completed levels pays `$32,000`.
- Return to Fastest Finger after a completed turn when eligible players remain. Mark completed players in game state so they cannot compete again.
- Track Hot Seat lifelines per turn with server-owned fields: `used_5050`, `used_audience`, `used_pass`, `removed_answers`, `audience_percentages`, and pass queue snapshots.
- Keep all lifeline decisions server-side. The browser can request a lifeline, but it cannot choose 50:50 removed answers, generate audience percentages, or decide Pass queue movement.
- 50:50 keeps the correct answer and one random wrong answer, then stores the two removed answer keys.
- Ask The Audience uses fake generated percentages only. Low levels are more confident, middle levels are mixed, and high levels are less reliable.
- If Ask The Audience and 50:50 are both used, removed answers show 0% and the visible answers still total 100%.
- Pass does not mark the passing player complete. It moves them to the back of the eligible queue, preserves their progress and used lifelines, and gives the next eligible player a new question at the same level.
- Pass is unavailable when there is no other eligible player.
- Keep final results server-owned. The browser can request results, but ranking, win/tie decisions, and stat updates are calculated by server routes using database state.
- Store final per-player result rows in `game_results` and use `rooms.results_finalized_at` as a one-time finalization guard so refreshes do not double-count stats.
- Use competition ranking for ties: tied players share the same placement and the next placement skips ahead.
- Count Fastest Finger wins from completed Fastest Finger rounds when final results are finalized.
- Allow Hot Seat question reports during gameplay, but store them server-side with room and turn context and do not expose correct answers.
- Block repeat reporting for the same Hot Seat question turn with a database unique index.
- Keep admin question tools basic for the MVP: admins can filter, search, review reports, deactivate, and reactivate questions, but advanced text editing is deferred.
- Hide temporary debug and test panels from normal users for the first family-testing version.
- Treat Milestone 11 as the first complete family-testing version unless serious bugs are found.
- After v1.0, normal player UI must be state-based: logged-out users see only account entry, logged-in users outside a room see only home/profile and room actions, waiting rooms see only lobby controls, active gameplay screens see only that gameplay state, and completed games see only final results and return options.
- Admin question tools stay hidden by default and only appear behind an admin-only section for accounts where `is_admin = true`.
- Refresh/reconnect is separate from intentional leaving. Startup/login restore checks active server membership and reloads the correct room/game screen, while the Leave Room button is the action that sets `left_at` and applies post-start rejoin blocking.
- Founder Access is separate from normal login. It is available only after a user is already logged in, validates server-side against server-only environment variables, rate-limits failed attempts, and only then sets the current account's `is_admin` flag.

## Open Risks

- Fair timing for Fastest Finger First needs careful server-side design.
- Large generated question set needs owner review to catch wrong, ambiguous, unsuitable, or overly obscure questions before heavy family use.
- 4-digit PIN accounts are simple for family use but weaker than full passwords, so rate limiting and careful storage matter.
- The Vercel project name is still `boardverse`; this is not public-facing but may be renamed later for clarity.
- The current Start Game flow performs several server operations in sequence rather than one database transaction. It is acceptable for the private MVP foundation but should be hardened with a Postgres function before heavier gameplay or larger groups.
- Realtime room events reveal only event metadata to subscribed browser clients. This is acceptable for the private MVP, but access policies should be reviewed again before broader public use.
- The 1,200-question Hot Seat bank is suitable for system testing but still needs owner review before heavy family use.
- Fastest Finger starter questions are suitable for gameplay testing, but should still be reviewed and expanded before broad family use.
- Hot Seat turn advancement currently uses sequential server operations rather than one transaction. This is acceptable for the private MVP but should eventually move into a Postgres function for stronger consistency.
- Lifeline updates currently use sequential server operations rather than one transaction. This is acceptable for the private MVP, but 50:50, Pass, and reveal transitions should eventually move into Postgres functions for stronger consistency under simultaneous clicks.
- Result finalization currently uses sequential server operations protected by a room-level finalization timestamp. This prevents duplicate stat updates for normal refresh/retry behavior, but a future Postgres function would make the whole finalization fully transactional.
- First family testing may reveal question-quality issues because the 1,200-question bank is generated and only automatically audited; reported questions should be reviewed regularly by an admin.
- Founder Access is intentionally simple for private owner use. If the app becomes broader than family testing, replace it with an environment-variable-backed owner bootstrap or a manual Supabase admin assignment process.
