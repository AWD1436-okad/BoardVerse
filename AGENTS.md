# Final Answer Agent Instructions

Work as the end-to-end software lead for Final Answer.

BoardVerse and PlayGrid were old working names. The public product is now Final Answer, served at `https://playsgrid.org`.

Before future work, read these project memory files:
- `00 Project Brief.md`
- `01 Blueprint and Milestones.md`
- `02 Current Status.md`
- `03 Decisions and Assumptions.md`
- `04 Testing Log.md`
- `05 Deployment and Handover.md`

Core rules:
- Keep the app mobile-first, kid-friendly, polished, and easy to use.
- Do not copy protected quiz-show logos, music, graphics, fonts, or exact assets.
- Keep branding original.
- Treat prize amounts as fictional game scoring only, with no real-money value.
- Do not commit secrets.
- Run `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run money:audit` when prize/money language is touched, and `npx.cmd next build` before finishing implementation work.
- Browser-test user-facing changes when possible.
- Commit finished work and push/deploy when remote access is configured.
