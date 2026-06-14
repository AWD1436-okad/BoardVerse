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
- Current public app: Final Answer Milestone 1 foundation.

## How To Run Locally

1. Install dependencies with `npm.cmd install`.
2. Start local development with `npm.cmd run dev`.
3. Open the local URL shown by Next.js.

## Required Environment Variables

Not configured yet.

Expected later:
- `NEXT_PUBLIC_SUPABASE_URL`: browser-safe Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe Supabase publishable key.
- Server-only Supabase/admin secrets if protected server operations need them.

Secrets must not be committed to code or normal notes.

## Data Storage Plan

Use Supabase Postgres for accounts, rooms, game state, questions, question reports, and stats. PINs must be hashed before storage.

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
- Supabase is not configured.
- No real accounts, rooms, realtime state, questions, reports, or stats exist yet.
- Full 1,200-question generation/import process still needs implementation and review.
