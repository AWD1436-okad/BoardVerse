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
