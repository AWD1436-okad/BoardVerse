# Decisions and Assumptions

## Locked Decisions

- Product name: PlayGrid.
- Old working name: BoardVerse.
- Public subtitle: Online Board Games.
- Browser app first; mobile app later.
- MVP is casual only. Ranked mode is later.
- Profile pictures are preset-only and called "profile pics".
- No custom image uploads in the MVP.
- Profile pics must be original block-style icons with no faces.
- MVP games are Tic Tac Toe, Connect Four, and Dots and Boxes.
- Fake game money has no real-world value.
- Voice chat is not in the MVP.

## Technical Assumptions

- Use Next.js, TypeScript, Tailwind CSS, Supabase, and Vercel.
- Use Supabase Row Level Security for user data safety.
- Use role-based admin protection.
- Use browser testing for critical user-facing flows.
- Use Vercel production deployment after GitHub and Vercel remotes are configured.

## Open Risks

- Public domain target is now `playsgrid.org`.
- Current Vercel deployment is still on a generated Vercel URL until `playsgrid.org` is connected.
- Supabase and Vercel access may require login or project setup outside the codebase.
- Realtime multiplayer and timer behavior must be tested carefully because browser refreshes and disconnects are high-risk flows.
