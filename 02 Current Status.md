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

