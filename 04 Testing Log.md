# Testing Log

## 2026-05-26 - Milestone 1

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.
- Desktop browser check at `http://localhost:3000` - passed.
- Mobile viewport browser check at 390 x 844 - passed.
- Production browser check at `https://boardverse-bice.vercel.app` - passed.

Browser results:
- Page title is `BoardVerse - Online Board Games`.
- BoardVerse starter page loads.
- Lobby Map and all 10 lobby areas are present.
- No horizontal overflow detected on desktop or mobile viewport.
- No browser console errors detected during the desktop check.
- Production page title is `BoardVerse - Online Board Games`.
- Production page shows BoardVerse, Lobby Map, and the expected lobby areas.

Known note:
- `npm.cmd audit --audit-level=moderate` reports a moderate issue inside Next's bundled PostCSS dependency. The suggested forced fix would install an old breaking Next version, so it was not applied. Recheck when a patched stable Next release is available.

## 2026-05-26 - Repair Audit and Clickable Shell

Checks run:
- `npm.cmd run typecheck` - passed.
- `npm.cmd run lint` - passed.
- `npm.cmd run money:audit` - passed.
- `npx.cmd next build` - passed.

Browser flow tested locally at `http://localhost:3000`:
- Filled username and password.
- Continued to first-time profile setup.
- Selected a preset profile pic.
- Entered the dashboard.
- Opened Lobbies from the main navigation.
- Selected `Sky Plaza`.
- Opened Rooms for the selected lobby.
- Created a local placeholder room named `Test Room`.
- Joined an existing placeholder room with invite code `DOT-442`.
- Confirmed backend-only buttons are disabled with visible reasons.
- Checked mobile viewport at 390 x 844 with no horizontal overflow.
- Checked browser console errors: none found.

Known limits:
- Auth, rooms, and invite-code joining are local placeholder flows only.
- No real database, realtime, chat, friends, admin, bots, timers, or games are connected yet.
