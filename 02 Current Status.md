# Current Status

## 2026-05-26

Milestone 1 completed locally.

Current state:
- Fresh Next.js project scaffolded in `C:\Users\abdul\OneDrive\Documents\Projects\BoardVerse`.
- TypeScript, Tailwind CSS, ESLint, npm, Supabase packages, and App Router are in place.
- Initial BoardVerse public starter screen added. BoardVerse is now the old working name; PlayGrid is the public product name.
- Project memory files created.
- Local checks pass.
- Local browser verification passes on desktop and mobile viewport.
- Git repository initialized and ready for the first commit.

## 2026-05-26 - Repair Audit and Clickable Shell

Repair milestone completed locally.

What exists now:
- Next.js App Router app with one public route: `/`.
- Clickable local placeholder flow for signup/login, first-time profile setup, dashboard, lobby selection, room creation, and invite-code room joining.
- Main navigation buttons are wired for Dashboard, Lobbies, and Rooms.
- Backend-dependent buttons are visibly disabled with reasons: Friends, Admin, Start Match, Invite Friend, and Room Chat.
- Room state is local browser state only. It is not saved to a database yet.

What is intentionally not built yet:
- Real Supabase auth.
- Persistent database records.
- Friends, admin tools, reports, chat, bots, realtime, timers, and game engines.
- Multiplayer gameplay.

TODO for next milestone:
- Connect Supabase auth and profile records.
- Replace local placeholder account state with real session state.
- Save rooms to Supabase before adding realtime room behavior.

## 2026-05-26 - PlayGrid Rebrand and Persistent Account Foundation

Milestone 2 foundation completed with browser-local persistence.

What works now:
- Public branding changed from BoardVerse to PlayGrid.
- Browser-local signup creates a unique username in local storage.
- Browser-local login checks the saved username and password.
- First-time profile setup saves a preset profile pic.
- Returning users stay logged in after refresh on the same browser.
- Dashboard shows profile, XP, level, fake money balance, and game totals.
- Rooms created in the browser persist in local storage.
- Logout and returning login work.
- The public metadata title is now `PlayGrid - Online Board Games`.

Still not production-real:
- Supabase auth is not connected yet.
- Account data is stored only in the user's browser.
- Passwords in this temporary local milestone are not production security.
- Stats are displayed but only game results will update them in a later milestone.

Next best milestone:
- Milestone 3: lobby areas, room details, local friends foundation, add-bot room setup, and clearer room host controls before real realtime/gameplay work.
