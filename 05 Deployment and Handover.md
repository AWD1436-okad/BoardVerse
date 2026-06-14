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

Not configured yet in Vercel.

Required for Milestone 2 accounts:
- `NEXT_PUBLIC_SUPABASE_URL`: browser-safe Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: browser-safe Supabase publishable key. This is expected for later client-side Supabase features.
- `SUPABASE_SECRET_KEY`: server-only Supabase secret key used by Next.js API routes to create accounts, verify PINs, create sessions, and update profiles.

Legacy fallback:
- `SUPABASE_SERVICE_ROLE_KEY` can be used instead of `SUPABASE_SECRET_KEY` if the Supabase project only shows legacy API keys.

Secrets must not be committed to code or normal notes.

## Data Storage Plan

Use Supabase Postgres for accounts, rooms, game state, questions, question reports, and stats. PINs are hashed server-side before storage.

Milestone 2 account tables are defined in:
- `supabase/final-answer-account-schema.sql`

Tables:
- `accounts`
- `account_stats`
- `account_login_attempts`
- `account_sessions`

Plain-English Supabase setup:
1. Open Supabase and create a project, or open the existing project you want to use.
2. Go to SQL Editor.
3. Open `supabase/final-answer-account-schema.sql` from this repo.
4. Copy the SQL into Supabase SQL Editor and run it once.
5. Go to Project Settings, then API Keys.
6. Copy the project URL into Vercel as `NEXT_PUBLIC_SUPABASE_URL`.
7. Copy the publishable key into Vercel as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
8. Copy the server-side secret key into Vercel as `SUPABASE_SECRET_KEY`.
9. Redeploy the Vercel production app.

Important:
- Do not paste Supabase keys into chat.
- Do not put Supabase keys into code.
- The secret key must not start with `NEXT_PUBLIC_` because that would expose it to browsers.

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
- Milestone 2 account code is implemented and deployed, but real account storage requires Supabase setup and Vercel env vars.
- No real rooms, realtime state, questions, reports, or gameplay stats updates exist yet.
- Full 1,200-question generation/import process still needs implementation and review.
