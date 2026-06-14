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
- Use simple room polling for the lobby foundation; realtime updates can be added when game state becomes richer.
- Keep chat out of Milestone 3 to avoid adding moderation and safety scope before the lobby foundation is stable.

## Open Risks

- Fair timing for Fastest Finger First needs careful server-side design.
- Large AI-generated question set needs quality review to avoid wrong, ambiguous, political, person-focused, religious, or overly obscure questions.
- 4-digit PIN accounts are simple for family use but weaker than full passwords, so rate limiting and careful storage matter.
- The Vercel project name is still `boardverse`; this is not public-facing but may be renamed later for clarity.
- Room lobby updates currently poll. This is acceptable for Milestone 3, but faster game screens should use server-backed realtime or tighter polling.
