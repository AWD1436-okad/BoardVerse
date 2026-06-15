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
- Start with a small seeded question set for development, then import/generate the full 1,200-question database after the schema and review process are ready.
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
- Use 240 generated starter questions first, not the full 1,200-question target, so the schema and report flow can be proven before scaling content.
- Use an `is_admin` boolean on accounts for the first admin foundation.
- Keep the admin seed route protected by account admin status.
- Store Fastest Finger ordering questions separately from hot-seat questions.
- Keep Fastest Finger correct orders server-side only; browser responses include prompt and item keys/text, not the correct order.
- Use server-created round timestamps for the 30-second Fastest Finger timer.
- Resolve Fastest Finger winners by fastest correct server-recorded response time, then earliest submitted timestamp if response times match exactly.
- Move rooms to `hot_seat` after a Fastest Finger winner is found, but leave actual Hot Seat gameplay for Milestone 7.

## Open Risks

- Fair timing for Fastest Finger First needs careful server-side design.
- Large AI-generated question set needs quality review to avoid wrong, ambiguous, political, person-focused, religious, or overly obscure questions.
- 4-digit PIN accounts are simple for family use but weaker than full passwords, so rate limiting and careful storage matter.
- The Vercel project name is still `boardverse`; this is not public-facing but may be renamed later for clarity.
- The current Start Game flow performs several server operations in sequence rather than one database transaction. It is acceptable for the private MVP foundation but should be hardened with a Postgres function before heavier gameplay or larger groups.
- Realtime room events reveal only event metadata to subscribed browser clients. This is acceptable for the private MVP, but access policies should be reviewed again before broader public use.
- Starter questions are suitable for system testing but still need owner review before heavy family use.
- Fastest Finger starter questions are suitable for gameplay testing, but should still be reviewed and expanded before broad family use.
